export const playNotificationSound = () => {
    console.log('[SOUND] playNotificationSound called. Path: /sounds/noti.mp3');
    try {
        const audio = new Audio('/sounds/noti.mp3');
        audio.volume = 1.0;
        
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('[SOUND] Playback successful');
            }).catch(error => {
                if (error.name === 'NotAllowedError') {
                    console.warn('[SOUND] Thông báo âm thanh bị trình duyệt chặn (Autoplay). Hãy click vào trang để kích hoạt chuông!');
                } else {
                    console.error('[SOUND] Lỗi phát âm thanh:', error);
                }
            });
        }
    } catch (error) {
        console.error('[SOUND] Critical Error:', error);
    }
};
