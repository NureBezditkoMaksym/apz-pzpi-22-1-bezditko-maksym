#include "tasks.h"
#include <RTClib.h>

extern RTC_DS3231 rtc;

TaskHandle_t healthCheckTaskHandle = NULL;

void startHealthCheckTask() {
  xTaskCreatePinnedToCore(
    healthCheckTask,
    "HealthCheckTask",
    4096,
    NULL,
    1,
    &healthCheckTaskHandle,
    1
  );
}

void healthCheckTask(void *parameter) {
  while (true) {
    DateTime now = rtc.now();
    int currentHour = now.hour();

    // if (currentHour >= 20) {
    if (currentHour >= 9) {
      Serial.println("Performing health check...");
      checkHealthMetricToday(config.email);
    } else {
      Serial.println("Skipping health check. It's before 9 AM.");
    }

    vTaskDelay(CHECK_INTERVAL / portTICK_PERIOD_MS);
  }
}
