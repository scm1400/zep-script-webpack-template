/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

;// ./src/OnJoinPlayer.ts
class OnJoinPlayer {
  constructor() {
    App.onJoinPlayer.Add(player => {
      player.showAlert("hello " + player.name);
    });
  }
}
;// ./main.ts

App.onInit.Add(() => {
  new OnJoinPlayer();
});
/******/ })()
;