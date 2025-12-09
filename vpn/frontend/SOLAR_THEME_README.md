# Solar Adaptive Theme System (S.A.T.S)

태양 위치 기반 동적 밝기 조절 시스템 - 다른 프로젝트에서 재사용 가능한 독립 라이브러리

## 개요

이 시스템은 사용자의 위치와 시간에 따라 태양의 고도를 계산하여, 웹사이트의 밝기를 0-100%로 자동 조절합니다.

### 동작 방식

| 모드 | 설명 |
|------|------|
| **Auto (기본)** | 태양 고도에 따라 0-100% 밝기 자동 조절 |
| **Light** | 완전한 라이트 모드 (0% - 가장 밝음) |
| **Dark** | 완전한 다크 모드 (100% - 가장 어두움) |

### 태양 고도 → 밝기 변환

```
태양 고도: +90° (정오, 머리 위) → 밝기 0% (가장 밝음)
태양 고도:  0° (일출/일몰)     → 밝기 50% (중간)
태양 고도: -90° (자정)         → 밝기 100% (가장 어두움)
```

---

## 설치 및 사용법

### 1. 파일 복사

`solar-adaptive-theme.js` 파일을 프로젝트에 복사합니다.

### 2. HTML에 스크립트 추가

```html
<script src="solar-adaptive-theme.js"></script>
```

### 3. 테마 버튼 추가 (선택사항)

```html
<button id="theme-btn" title="Toggle Theme">
    <ion-icon name="moon-outline"></ion-icon>
</button>
```

### 4. CSS 변수 사용

라이브러리가 자동으로 다음 CSS 변수들을 업데이트합니다:

```css
:root {
    /* 기본 밝기 정보 */
    --theme-brightness: 80;       /* 0-100 */
    --theme-factor: 0.8;          /* 0.0-1.0 */
    --theme-inverse-factor: 0.2;  /* 1.0-0.0 */
    
    /* 동적 색상 */
    --bg-dynamic: rgb(R, G, B);           /* 배경색 */
    --text-dynamic: rgb(R, G, B);         /* 텍스트 색상 */
    --text-muted-dynamic: rgb(R, G, B);   /* 보조 텍스트 색상 */
    
    /* 동적 효과 */
    --glass-bg-dynamic: rgba(...);        /* 유리 효과 배경 */
    --glass-border-dynamic: rgba(...);    /* 유리 효과 테두리 */
    --shadow-intensity: 0.2;              /* 그림자 강도 */
    --accent-saturation: 100%;            /* 액센트 채도 */
}
```

### 5. CSS에서 변수 적용

```css
body {
    background-color: var(--bg-dynamic, #050510);  /* 폴백 포함 */
    color: var(--text-dynamic, #ffffff);
    transition: background-color 1s ease, color 0.5s ease;
}

.header {
    background: color-mix(in srgb, var(--bg-dynamic) 70%, transparent);
}

.glass-card {
    background: var(--glass-bg-dynamic);
    border: 1px solid var(--glass-border-dynamic);
}
```

---

## JavaScript API

### 상태 조회

```javascript
const state = SolarAdaptiveTheme.getState();
console.log(state.mode);       // 'auto', 'light', 'dark'
console.log(state.brightness); // 0-100
console.log(state.solarAltitude); // -90 ~ +90
```

### 모드 설정

```javascript
// 특정 모드로 설정
SolarAdaptiveTheme.setMode('auto');
SolarAdaptiveTheme.setMode('light');
SolarAdaptiveTheme.setMode('dark');

// 모드 순환 (Auto → Light → Dark → Auto)
SolarAdaptiveTheme.cycleMode();
```

### 위치 수동 설정

```javascript
// 서울
SolarAdaptiveTheme.setLocation(37.5665, 126.9780);

// 두바이
SolarAdaptiveTheme.setLocation(25.2048, 55.2708);
```

### 강제 업데이트

```javascript
SolarAdaptiveTheme.update();
```

### 디버그 모드

```javascript
SolarAdaptiveTheme.debug(true);  // 콘솔에 상세 로그 출력
```

---

## 이벤트

테마가 변경될 때 커스텀 이벤트가 발생합니다:

```javascript
window.addEventListener('themechange', (e) => {
    console.log('Mode:', e.detail.mode);
    console.log('Brightness:', e.detail.brightness);
});
```

---

## 설정 커스터마이징

라이브러리 상단의 `CONFIG` 객체를 수정하여 동작을 변경할 수 있습니다:

```javascript
const CONFIG = {
    UPDATE_INTERVAL: 60000,     // 자동 업데이트 간격 (ms)
    DEFAULT_LATITUDE: 37.5665,  // 기본 위도 (위치 정보 불가 시)
    DEFAULT_LONGITUDE: 126.9780, // 기본 경도
    MIN_BRIGHTNESS: 0,          // 최소 밝기 (0 = 가장 밝음)
    MAX_BRIGHTNESS: 100,        // 최대 밝기 (100 = 가장 어두움)
    DEBUG: false                // 디버그 로그 출력
};
```

---

## 로컬 스토리지

다음 키가 자동으로 저장됩니다:

| 키 | 용도 |
|----|------|
| `sats_theme_mode` | 사용자가 선택한 테마 모드 |
| `sats_user_location` | 캐시된 위치 정보 (24시간) |

---

## 브라우저 지원

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

※ `color-mix()` CSS 함수를 사용하므로 최신 브라우저 권장

---

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능
