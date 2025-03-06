/**
 * @file PlaybackController.js
 * @description Manages playback functionality, including button states, WaveSurfer visualization, region selection, and controlling the SoundEngine.
 * @version 1.1.0
 * @license MIT
 */

import { ButtonSingle } from './ButtonSingle.js';
import WaveSurfer from 'https://cdn.jsdelivr.net/npm/wavesurfer.js@7/dist/wavesurfer.esm.js';
import RegionsPlugin from 'https://cdn.jsdelivr.net/npm/wavesurfer.js@7/dist/plugins/regions.esm.js';

export class PlaybackController {
  constructor(soundEngine) {
    this.soundEngine = soundEngine;
    this.wavesurfer = null;

    console.debug('[PlaybackController] Constructor - SoundEngine:', soundEngine);

    // Initialize the buttons
    this.initPlaybackButtons();

    // Initialize WaveSurfer + events
    this.initWaveSurferPeaks();

    // Keep track of current scroll offset
    this.currentScroll = 0;
  }

  /**
   * Create and set up your buttons.
   */
  initPlaybackButtons() {

    this.zoomButton = new ButtonSingle(
      "#playback-zoom",
      "/assets/icons/playback-zoom.svg",
      null,
      "pan-zoom",
      null,
      "moveGroup",
      false
    );

    this.selectorButton = new ButtonSingle(
      "#playback-selector",
      "/assets/icons/playback-selector.svg",
      null,
      "default",
      null,
      "moveGroup",
      false
    );

    // Loop group
    this.loopButton = new ButtonSingle(
      "#playback-loop",
      "/assets/icons/playback-loop.svg",
      () => { 
          console.log('[PlaybackController] Loop button clicked');
          this.setRegionLoopVisualState();
  
          if (this.soundEngine) {
              this.soundEngine.sendEvent('loop', [this.loopButton.isActive ? 1 : 0]);
          }
      },
      "default",
      null,
      "loopGroup",
      false
  );



  }
  setRegionLoopVisualState() {
    if (!this.activeRegion) {
        console.warn('[PlaybackController] No active region to update');
        return;
    }

    const isLooping = this.loopButton.isActive;
    console.log(`[PlaybackController] setRegionLoopVisualState(${isLooping}) called`);

    const newColor = isLooping
        ? 'rgba(215, 215, 215, 0.8)'  // Loop active (visible)
        : 'rgba(0, 0, 0, 0.0)';       // Loop inactive (hidden)

    // Set style directly — skip all Wavesurfer "update" problems
    this.activeRegion.element.style.backgroundColor = newColor;
    this.activeRegion.element.style.transition = 'background-color 0.3s';  // Optional smooth transition

    console.log(`[PlaybackController] Set region element color directly to: ${newColor}`);
}
  /**
   * Fetch waveform JSON, create WaveSurfer, attach events.
   */
  async initWaveSurferPeaks() {
    console.debug('[PlaybackController] initWaveSurferPeaks() called.');
    try {
      const waveformJSONURL = this.soundEngine?.trackData?.waveformJSONURL;
      if (!waveformJSONURL) {
        console.warn("[PlaybackController] No waveformJSONURL provided.");
        return;
      }

      console.log("[PlaybackController] Fetching waveform JSON from:", waveformJSONURL);
      const resp = await fetch(waveformJSONURL);
      if (!resp.ok) {
        throw new Error(`Waveform JSON fetch failed: ${resp.status}`);
      }
      const waveData = await resp.json();
      if (!waveData || !waveData.data || !Array.isArray(waveData.data)) {
        throw new Error("[PlaybackController] Invalid waveform JSON: 'data' array missing.");
      }

      const approximateDuration = waveData.durationSec || 120;
      const peaks = waveData.data;
      const waveformContainer = document.querySelector('#waveform');
      if (!waveformContainer) {
        throw new Error("[PlaybackController] Cannot find #waveform container.");
      }

      // Retrieve styling from CSS
      const rootStyles = getComputedStyle(document.documentElement);
      const waveColor = rootStyles.getPropertyValue('--color1').trim() || "#888";
      const progressColor = rootStyles.getPropertyValue('--color2').trim() || "#555";
      const cursorColor = rootStyles.getPropertyValue('--color2').trim() || "#333";
      const waveformHeight = parseInt(rootStyles.getPropertyValue('--waveform-height')) || 120;

      console.debug('[PlaybackController] Creating WaveSurfer instance:', waveColor, progressColor, cursorColor);

      // Regions plugin
      this.regions = RegionsPlugin.create();

      // Build WaveSurfer with minPxPerSec=5 to ensure we never zoom out more than full view
      this.wavesurfer = WaveSurfer.create({
        container: waveformContainer,
        waveColor: waveColor,
        progressColor: progressColor,
        cursorColor: cursorColor,
        height: waveformHeight,
        scrollParent: true,
        minPxPerSec: 5, // NEW: ensures starting zoom won't exceed full waveform
        normalize: true,
        hideScrollbar: false,
        fillParent: true,
        barWidth: 2,
        barGap: .6,
        barRadius: 1,
        interact: true,
        plugins: [this.regions]
      });

      console.debug('[PlaybackController] Loading peaks with approximateDuration:', approximateDuration);
      // Load the waveform data
      this.wavesurfer.load(null, peaks, approximateDuration);

      // Display total duration after decoding
      const timeEl = document.getElementById('waveform-time');
      const durationEl = document.getElementById('waveform-duration');
      this.wavesurfer.on('decode', (duration) => {
        console.debug('[WaveSurfer Event] decode - duration:', duration);
        if (durationEl) {
          durationEl.textContent = this.formatTime(duration);
        }

        // NEW: Make sure we start scrolled to zero so "0:00" is on the left
        this.wavesurfer.setScroll(0);
      });

      // Update current time
      this.wavesurfer.on('timeupdate', (currentTime) => {
        if (timeEl) {
          timeEl.textContent = this.formatTime(currentTime);
        }
      });

      // Debug logs
      this.wavesurfer.on('zoom', (val) => {
        console.log(`[WaveSurfer Event] zoom => ${val}`);
      });
      this.wavesurfer.on('scroll', (visibleStartTime, visibleEndTime, scrollLeft, scrollRight) => {
        console.log(`[WaveSurfer Event] scroll => startTime=${visibleStartTime}, endTime=${visibleEndTime}, scrollLeft=${scrollLeft}, scrollRight=${scrollRight}`);
      });
      this.wavesurfer.on('interaction', (t) => {
        console.log(`[WaveSurfer Event] interaction => newTime=${t}`);
      });
      this.wavesurfer.on('click', (rx, ry) => {
        console.log(`[WaveSurfer Event] click => x=${rx}, y=${ry}`);
      });

      // Keep existing region selection & pointer-based zoom
      this.initPlaybackSelector();
      this.initZoomHandler();



      console.log("[PlaybackController] WaveSurfer and regions initialized successfully.");
    } catch (err) {
      console.error("[PlaybackController] Error in initWaveSurferPeaks():", err);
    }
  }

/**
 * Helper: disable drag selection if active.
 */
disableDragSelectionAll() {
  if (this.disableDragSelectionFn) {
    this.disableDragSelectionFn();
    this.disableDragSelectionFn = null;
    console.log('[PlaybackController] Drag selection disabled.');
  }
}

/**
 * Region selection using drag.
 * Loop regions are only created when the selector tool is active.
 * Once created, a loop region persists even after disabling the selector.
 */
initPlaybackSelector() {
  console.debug('[PlaybackController] initPlaybackSelector() called.');
  const waveformContainer = document.querySelector('#waveform');
  if (!waveformContainer) {
      console.error("[PlaybackController] No #waveform container found for region selection.");
      return;
  }

  // Track the current loop region and the disable function returned by enableDragSelection.
  this.activeRegion = this.activeRegion || null;
  this.disableDragSelectionFn = null;

  // Helper to update waveform cursor dynamically
  const updateCursor = () => {
      if (this.selectorButton.isActive) {
          waveformContainer.style.cursor = "crosshair";
      } else {
          waveformContainer.style.cursor = "default";
      }
  };

  // Toggle selector mode.
  this.selectorButton.clickHandler = () => {
      if (this.selectorButton.isActive) {
          console.log("[PlaybackController] Selector active: enabling drag selection.");
          if (!this.disableDragSelectionFn) {
              this.disableDragSelectionFn = this.regions.enableDragSelection({
                  color: 'rgba(215, 215, 215, 0.8)',
              });
          }
      } else {
          console.log("[PlaybackController] Selector inactive: disabling drag selection.");
          this.disableDragSelectionAll();
      }
      updateCursor();
  };

  // Update cursor when entering/leaving waveform
  waveformContainer.addEventListener('mousemove', (e) => {
    if (!this.selectorButton.isActive) {
        waveformContainer.style.cursor = "default";
        return;
    }

    const isOverRegion = e.target.closest('.wavesurfer-region');
    waveformContainer.style.cursor = isOverRegion ? "move" : "crosshair";
});

  // When a region is created via dragging…
  this.regions.on('region-created', (region) => {
      if (!this.selectorButton.isActive) {
          region.remove();
          return;
      }

      // Enforce a single loop region: remove any previous one.
      if (this.activeRegion && this.activeRegion.id !== region.id) {
          this.activeRegion.remove();
      }
      this.activeRegion = region;

      // Set color immediately based on loop button state.
      const color = this.loopButton.isActive
          ? 'rgba(215, 215, 215, 0.8)'  // Loop active = visible
          : 'rgba(0, 0, 0, 0.0)';       // Loop inactive = invisible

      this.activeRegion.element.style.backgroundColor = color;
      this.activeRegion.element.style.transition = 'background-color 0.3s';

      console.log(`[PlaybackController] New region created with color: ${color}`);
  });

  // When a region is clicked, mark it as active (only if selector is active).
  this.regions.on('region-clicked', (region, e) => {
      e.stopPropagation();
      if (this.selectorButton.isActive) {
          this.activeRegion = region;
          console.log('[PlaybackController] Loop region selected:', region);
      }
  });
}
/**
 * Zoom-only logic with pointer-based dragging:
 * - When the zoom button is active, vertical dragging adjusts the zoom level.
 * - Horizontal movement is ignored.
 * - Vertical movement is clamped to prevent excessive jumps.
 */

initZoomHandler() {
  console.debug('[PlaybackController] initZoomHandler() called.');
  if (!this.wavesurfer) {
      console.error("[PlaybackController] Wavesurfer is not initialized;");
      return;
  }

  const waveformContainer = document.querySelector('#waveform');
  if (!waveformContainer) {
      console.error("[PlaybackController] No #waveform container found.");
      return;
  }

  const minZoom = 5;
  const maxZoom = 3000;
  const sensitivity = (maxZoom - minZoom) / 1300;
  const maxDeltaY = 60;

  let isDragging = false;
  let startX = 0, startY = 0;
  let startZoom = 0;


  // ✅ Hook into zoom button click
  this.zoomButton.clickHandler = () => {
      this.disableDragSelectionAll();

      if (this.zoomButton.isActive) {
          console.log('[PlaybackController] Zoom active: disabling waveform interaction.');
          this.wavesurfer.setOptions({ interact: false });
      } else {
          console.log('[PlaybackController] Zoom inactive: enabling waveform interaction.');
          this.wavesurfer.setOptions({ interact: true });
      }

      updateCursor();  // Force update when button changes state
  };

  const pointerDown = (evt) => {
      if (!this.zoomButton.isActive) return;
      isDragging = true;
      startX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      startY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      startZoom = this.wavesurfer.params.minPxPerSec || minZoom;
      waveformContainer.style.cursor = "grabbing";
      evt.preventDefault();
  };

  const pointerMove = (evt) => {
      if (!isDragging) return;
      const currentY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      const deltaY = startY - currentY;
      let clampedDeltaY = Math.max(-maxDeltaY, Math.min(maxDeltaY, deltaY));
      let newZoom = startZoom + sensitivity * clampedDeltaY;
      this.wavesurfer.zoom(Math.max(minZoom, Math.min(maxZoom, newZoom)));
  };

  const pointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      updateCursor();
  };

  waveformContainer.addEventListener('mousedown', pointerDown);
  document.addEventListener('mousemove', pointerMove);
  document.addEventListener('mouseup', pointerUp);

  waveformContainer.addEventListener('touchstart', pointerDown, { passive: false });
  waveformContainer.addEventListener('touchmove', pointerMove, { passive: false });
  waveformContainer.addEventListener('touchend', pointerUp);
}  /**
   * Formats time (in seconds) => mm:ss
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60) || 0;
    const secs = Math.floor(seconds % 60) || 0;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ----------------------------------------------------------------
  // Example SoundEngine controls
  // ----------------------------------------------------------------

  play() {
    if (this.soundEngine && typeof this.soundEngine.play === 'function') {
      console.debug('[PlaybackController] play() => calling soundEngine.play()');
      this.soundEngine.play();
    } else {
      console.warn('[PlaybackController] soundEngine.play() not available.');
    }
  }
  
  pause() {
    if (this.soundEngine && typeof this.soundEngine.pause === 'function') {
      console.debug('[PlaybackController] pause() => calling soundEngine.pause()');
      this.soundEngine.pause();
    } else {
      console.warn('[PlaybackController] soundEngine.pause() not available.');
    }
  }

  setPlayRange(min = null, max = null) {
    console.debug('[PlaybackController] setPlayRange()', { min, max });
    if (this.soundEngine && typeof this.soundEngine.sendEvent === 'function') {
      if (min !== null) this.soundEngine.sendEvent("setPlayMin", [min]);
      if (max !== null) this.soundEngine.sendEvent("setPlayMax", [max]);
    }
  }

  loop() {
    console.debug('[PlaybackController] loop() => sending loop event [1]');
    if (this.soundEngine && typeof this.soundEngine.sendEvent === 'function') {
      this.soundEngine.sendEvent("loop", [1]);
    }
  }

  unloop() {
    console.debug('[PlaybackController] unloop() => sending loop event [0]');
    if (this.soundEngine && typeof this.soundEngine.sendEvent === 'function') {
      this.soundEngine.sendEvent("loop", [0]);
    }
  }
}