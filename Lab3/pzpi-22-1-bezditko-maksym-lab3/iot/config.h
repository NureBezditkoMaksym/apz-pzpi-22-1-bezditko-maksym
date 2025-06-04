#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <RTClib.h>

#define LED_PIN 2

struct Config {
  String wifi_ssid;
  String server_url;
  String email;
};

extern Config config;
extern RTC_DS3231 rtc;

void loadConfig(Config &cfg);

#endif
