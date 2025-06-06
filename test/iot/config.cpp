#include "config.h"

Config config;
RTC_DS3231 rtc;

void loadConfig(Config &cfg) {
  cfg.wifi_ssid = "Wokwi-GUEST";
  cfg.server_url = "https://liidbdlfcghqjvfjdhqq.supabase.co";

  Serial.println("Введіть email користувача:");
  while (Serial.available() == 0) {
    delay(100);
  }

  cfg.email = Serial.readStringUntil('\n');
  cfg.email.trim();

  Serial.print("Email збережено: ");
  Serial.println(cfg.email);
}
