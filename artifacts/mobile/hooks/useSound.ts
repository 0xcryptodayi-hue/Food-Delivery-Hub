import { useCallback } from "react";
import { Audio } from "expo-av";

type SoundName = "add_to_cart" | "order_complete" | "message_received" | "notification";

const SOUND_FILES: Record<SoundName, number> = {
  add_to_cart: require("../assets/sounds/add_to_cart.wav"),
  order_complete: require("../assets/sounds/order_complete.wav"),
  message_received: require("../assets/sounds/message_received.wav"),
  notification: require("../assets/sounds/notification.wav"),
};

export function useSound() {
  const play = useCallback(async (name: SoundName) => {
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(SOUND_FILES[name]);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch {
      // Silently ignore audio errors
    }
  }, []);

  return { play };
}
