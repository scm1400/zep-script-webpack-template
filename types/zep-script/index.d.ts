/**
 * zep-script 라이브러리의 타입 정의를 확장하는 파일입니다.
 *
 * 이 파일은 zep-script의 기본 d.ts 파일에 누락된 API들을
 * 모듈 보강(module augmentation) 방식으로 추가 정의합니다.
 *
 * 주요 기능:
 * - ScriptPlayer 인터페이스 확장 (개별 오브젝트, 사운드, 스토리지 등 API 추가)
 * - ScriptApp 네임스페이스 확장 (서버 환경, 위치 이벤트, Phaser 관련 API 추가)
 * - 타입 안전성 향상 및 IDE 자동완성 지원
 */

import "zep-script";
import { ScriptDynamicResource, ScriptPlayer } from "zep-script";

// 기타 타입 정의
export enum CameraEffectType {
	NONE = 0,
	SPOTLIGHT = 1,
}

export interface MapDataTileObject {
	param1?: string;
	[key: string]: any;
}

declare module "zep-script" {
	interface ScriptPlayer {
		/* 1. 라이브러리에서 지원하지만, 보강이 필요한 API */

		// 파라미터 key를 옵셔널로 처리하는 오버로딩
		stopSound(key?: string): void;

		// playSound와 동일한 파라미터 구조로 수정
		playSoundLink(
			link: string,
			loop?: boolean,
			overlap?: boolean,
			key?: string,
			volume?: number
		): void;

		// 오탈자 수정 (hideByAlert로 잘못 작성됨)
		hideBuyAlert(): void;

		// 다른 형식의 파라미터 사용을 오버로딩
		setCameraTarget(key: string, time?: number): void;

		// 다른 형식의 파라미터 사용을 오버로딩
		setCameraTarget(player: ScriptPlayer): void;

		// 신규 파라미터 individual 추가
		setEffectSprite(
			sprite: ScriptDynamicResource,
			offsetX?: number,
			offsetY?: number,
			type?: number,
			individual?: boolean
		): void;

		// 신규 파라미터 locale 추가
		localize(key: string, locale?: string): string;

		/* 2. 라이브러리에 추가가 필요한 공개 API */

		// 2.1. 가이드에 있는 속성

		showWidgetResponsive(
			fileName: string,
			marginTop: number,
			marginRight: number,
			marginBottom: number,
			marginLeft: number
		): void;

		// 2.2. 가이드에 없는 속성

		disableAttack: boolean;
		cameraEffectParam1: number; // 가이드에는 ScriptApp에만 있음

		putIndividualObject(
			tileX: number,
			tileY: number,
			sprite: ScriptDynamicResource | null,
			options?: any
		): void;
		playIndividualObjectAnimation(key: string, animationName: string, repeatNum: number): void;
		removeIndividualObject(key: string): void;

		shakeScreen(duration: number, intensity: number, force: boolean): void;
		setScreenSaturation(saturation: number): void;
		setCameraEffectParam(type: CameraEffectType, param: number): void;

		/* 3. 비공개 API */

		/** @internal 비공개 API */ scaleX: number;
		/** @internal 비공개 API */ scaleY: number;
		/** @internal 비공개 API */ avatarFileName: string;

		/** @internal 비공개 API */ isIframe: boolean;
		/** @internal 비공개 API */ referrer: string;

		/** @internal 비공개 API */
		setNavigatorTarget(x: number, y: number): void;
		/** @internal 비공개 API */
		clearNavigatorTarget(): void;

		/** @internal 비공개 API */
		playAnimation(
			animationName: string,
			options?: {
				repeat?: number;
				repeatDelay?: number;
				startFrame?: number;
				frameRate?: number;
				allowInterrupt?: boolean;
			}
		): void;

		/** @internal 비공개 API */
		stopAnimation(): void;

		/** @internal 비공개 API */
		setDestination(
			x: number,
			y: number,
			allowInterrupt?: boolean,
			skipCollisionCheck?: boolean
		): void;

		/** @internal 비공개 API */
		setScale(scaleX: number, scaleY: number): void;

		/** @internal 비공개 API */
		getAvatarParts(): {
			avatarId: number;
			clothesId: number;
			faceId: number;
			hairId: number;
		};

		/** @internal 비공개 API */
		setAvatarParts(avatarParts: {
			avatarId?: number;
			clothesId?: number;
			faceId?: number;
			hairId?: number;
		}): void;

		/** @internal 비공개 API */
		getEffectSprite(index: number): ScriptDynamicResource | null;

		/** @internal 비공개 API */
		setCustomEffectSprite(
			layerIndex: number,
			sprite: ScriptDynamicResource | null,
			offsetX?: number,
			offsetY?: number,
			type?: number,
			individual?: boolean
		): void;

		/** @internal 비공개 API */
		playCustomEffectSprite(
			layerIndex: number,
			sprite: ScriptDynamicResource | null,
			repeatNum: number,
			offsetX?: number,
			offsetY?: number
		): void;

		/** @internal 비공개 API */
		hasEmailDomain(domain: string): boolean;

		/** @internal 비공개 API */
		sayObjectWithKey(key: string, message: string): void;

		/** @internal 비공개 API */
		sendParentWindowMessage(message: any): void;
		/** @internal 비공개 API */
		sendAnalyticsTrack(eventName: string, properties: Record<string, any>): void;

		/** @internal 비공개 API */
		getLocalStorageItem(key: string, callback: (res: any) => void): void;
		/** @internal 비공개 API */
		setLocalStorageItem(key: string, value: string): void;

		/** @internal 비공개 API */
		getSessionStorageItem(key: string, callback: (res: any) => void): void;
		/** @internal 비공개 API */
		setSessionStorageItem(key: string, value: string): void;
		/** @internal 비공개 API */
		removeSessionStorageItem(key: string): void;

		/** @internal 비공개 API */
		addPhaserGo(config: any): void;
		/** @internal 비공개 API */
		removePhaserGo(objectName: string): void;
		/** @internal 비공개 API */
		callPhaserFunc(objectName: string, methodName: string, args?: any[]): void;

		/** @internal 비공개 API */
		setCustomCollider(offsetX: number, offsetY: number, width: number, height: number): void;

		/** @internal 비공개 API */
		playObjectAnimationWithKey(key: string, animationName: string, repeatNum: number): void;

		/** @internal 비공개 API */
		setOffset(offsetX: number, offsetY: number): void;
		/** @internal 비공개 API */
		setCustomAnims(
			anims: {
				down_idle?: frameInfo;
				down?: frameInfo;
				left_idle?: frameInfo;
				left?: frameInfo;
				right_idle?: frameInfo;
				right?: frameInfo;
				up_idle?: frameInfo;
				up?: frameInfo;
				down_jump?: frameInfo;
				left_jump?: frameInfo;
				right_jump?: frameInfo;
				up_jump?: frameInfo;
				down_sit?: frameInfo;
				left_sit?: frameInfo;
				right_sit?: frameInfo;
				up_sit?: frameInfo;
				left_attack?: frameInfo;
				right_attack?: frameInfo;
				up_attack?: frameInfo;
				down_attack?: frameInfo;
				dance?: frameInfo;
			} | null
		): void;
	}

	type frameInfo = {
		frames: number[];
		frameRate: number;
		repeat: number;
	};
}

declare global {
	namespace ScriptApp {
		/* 1. 라이브러리에서 지원하지만, 보강이 필요한 API */

		namespace onObjectTouched {
			function Add(
				callback: (
					sender: ScriptPlayer,
					x: number,
					y: number,
					tileID: number,
					obj: MapDataTileObject
				) => void
			): void;
		}

		/* 2. 라이브러리에 추가가 필요한 공개 API */

		function addOnLocationEnter(name: string, callback: (player: ScriptPlayer) => void): void;
		function addOnLocationExit(
			locationName: string,
			callback: (player: ScriptPlayer) => void
		): void;
		function addOnPrivateAreaEnter(
			areaNumber: number,
			callback: (player: ScriptPlayer, areaNumber: number) => void
		): void;
		function addOnPrivateAreaExit(
			areaNumber: number,
			callback: (player: ScriptPlayer, areaNumber: number) => void
		): void;

		function shakeScreen(duration: number, intensity: number, force: boolean): void;

		namespace onPlayerNameChanged {
			function Add(callback: (player: ScriptPlayer, oldName: string) => void): void;
		}

		/* 3. 비공개 API */

		/** @internal 비공개 API */
		function loadSpritesheetUrl(url: string): ScriptDynamicResource;

		/** @internal 비공개 API */
		function loadSpritesheetUrl(
			url: string,
			frameWidth: number,
			frameHeight: number,
			animations: any,
			frameRate: number
		): ScriptDynamicResource;

		/** @internal 비공개 API */
		function getServerEnv(): string;
		/** @internal 비공개 API */
		function getServerId(): string;

		/** @internal 비공개 API */
		function addPhaserGo(config: any): void;
		/** @internal 비공개 API */
		function removePhaserGo(objectName: string): void;
		/** @internal 비공개 API */
		function callPhaserFunc(objectName: string, methodName: string, args?: any[]): void;

		/** @internal 비공개 API */
		function destroyRoom(): void;

		namespace onJoinPlayer {
			/** @internal 비공개 API */
			function Remove(callback: (player: ScriptPlayer) => void): void;
		}

		namespace onParentWindowMessage {
			/** @internal 비공개 API */
			function Add(callback: (player: ScriptPlayer, message: string) => void): void;
		}
	}
}

export {};
