import { db, storage } from "./app-firebase.js";
import { initializeAlbum } from "./album-controller.js";
import { initializeSyncListener } from "./sync-service.js";

function startApplication() {
  document.dispatchEvent(new CustomEvent("firebaseReady", {
    detail: { db, storage }
  }));
  
  initializeAlbum();
  initializeSyncListener();
}

function onDeviceReady() {
  startApplication();
}

if (window.cordova) {
  document.addEventListener("deviceready", onDeviceReady, false);
} else {
  startApplication();
}