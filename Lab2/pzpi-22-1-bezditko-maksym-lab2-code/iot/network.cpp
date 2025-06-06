#include "network.h"

bool connectWiFi(const String &ssid) {
  WiFi.begin(ssid.c_str());
  unsigned long startAttemptTime = millis();
  const unsigned long timeout = 20000;

  while (WiFi.status() != WL_CONNECTED && (millis() - startAttemptTime) < timeout) {
    delay(500);
  }

  return WiFi.status() == WL_CONNECTED;
}
