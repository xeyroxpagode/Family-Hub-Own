'use strict';

/**
 * Node stub for `expo-video`.
 *
 * Only the import-time surface the HomeCloud Files Viewer touches, so the REAL
 * Viewer screen can be mounted in plain Node without a device. It stands in for
 * what a device supplies: the player object and the view component.
 *
 * It is deliberately inert and honest. It does NOT emulate decoding, it does not
 * report progress, and it never pretends playback succeeded - `status` stays at
 * `'idle'`. A test that needs real playback evidence is a DEVICE test and is
 * reported as UNPROVEN_DEVICE, never as a PASS produced by this stub.
 */

function createStubPlayer(source) {
  return {
    source,
    status: 'idle',
    playing: false,
    play: () => {},
    pause: () => {},
    replace: () => {},
    release: () => {},
    remove: () => {},
  };
}

exports.useVideoPlayer = function useVideoPlayer(source) {
  return createStubPlayer(source);
};

exports.createVideoPlayer = function createVideoPlayer(source) {
  return createStubPlayer(source);
};

exports.VideoView = function VideoViewStub() {
  return null;
};

exports.isPictureInPictureSupported = () => false;
exports.clearVideoCacheAsync = async () => undefined;
exports.setVideoCacheSizeAsync = async () => undefined;
exports.getCurrentVideoCacheSize = async () => 0;