'use strict';

/**
 * Node stub for `expo-audio`.
 *
 * Only the import-time surface the HomeCloud Files Viewer touches, so the REAL
 * Viewer screen can be mounted in plain Node without a device.
 *
 * Like the video stub it is inert and honest: the player reports `playing: false`
 * and never advances a position. It does not emulate decoding and never pretends
 * audio played. Real playback evidence is a DEVICE obligation and is reported as
 * UNPROVEN_DEVICE.
 */

function createStubPlayer(source) {
  return {
    source,
    playing: false,
    isLoaded: false,
    duration: 0,
    currentTime: 0,
    play: () => {},
    pause: () => {},
    seekTo: () => {},
    replace: () => {},
    remove: () => {},
    release: () => {},
  };
}

exports.createAudioPlayer = function createAudioPlayer(source) {
  return createStubPlayer(source);
};

exports.useAudioPlayer = function useAudioPlayer(source) {
  return createStubPlayer(source);
};

exports.useAudioPlayerStatus = function useAudioPlayerStatus() {
  return { playing: false, didJustFinish: false, isLoaded: false, isPlaying: false, duration: 0, currentTime: 0 };
};

exports.setAudioModeAsync = async () => undefined;
exports.setIsAudioActiveAsync = async () => undefined;
exports.requestRecordingPermissionsAsync = async () => ({ granted: false, status: 'undetermined' });
exports.requestNotificationPermissionsAsync = async () => ({ granted: false, status: 'undetermined' });
exports.requestMicrophonePermissionsAsync = async () => ({ granted: false, status: 'undetermined' });
exports.preload = async () => undefined;
exports.clearPreloadedSource = async () => undefined;
exports.clearAllPreloadedSources = async () => undefined;