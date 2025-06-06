#include <ezButton.h>
#include "config.h"
#include "buttons.h"
#include "tasks.h"
#include "network.h"
#include "api.h"

void setup() {
  Serial.begin(115200);
  Serial.println("Starting Health Tracker...");

  pinMode(LED_PIN, OUTPUT);
  loadConfig(config);

  if (!connectWiFi(config.wifi_ssid)) {
    Serial.println("Wi-Fi connection failed. Restarting...");
    delay(5000);
    ESP.restart();
  }

  if (!rtc.begin()) {
    Serial.println("Couldn't find RTC. Dead now.");
    while (1);
  }

  initializeButtons();
  startHealthCheckTask();
}

void loop() {
  handleButtonEvents();
}
