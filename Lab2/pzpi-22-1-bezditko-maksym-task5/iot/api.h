#ifndef API_H
#define API_H

#include <Arduino.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <config.h>

void updateHealthMetric(const String &server_url, const String &email, int calories, int water_ml, int steps);
bool hasDailyData(const String &server_url, const String &email);
void checkHealthMetricToday(const String &email);

#endif
