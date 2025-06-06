#include "api.h"

void updateHealthMetric(const String &server_url, const String &email, int calories, int water_ml, int steps) {
  HTTPClient http;
  String endpoint = server_url + "/functions/v1/create-health-metric";

  DynamicJsonDocument doc(256);
  doc["user_email"] = email;
  doc["calories"] = calories;
  doc["water_ml"] = water_ml;
  doc["steps"] = steps;

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.printf("Sending request to: %s\n", endpoint.c_str());
  Serial.printf("Request body: %s\n", requestBody.c_str());

  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(requestBody);
  http.end();

  if (httpCode == 200 || httpCode == 201) {
    Serial.println("Health metric updated successfully.");

    digitalWrite(LED_PIN, LOW);
  } else {
    Serial.printf("Failed to update metric. HTTP code: %d\n", httpCode);
  }
}

bool hasDailyData(const String &server_url, const String &email) {
  HTTPClient http;
  String endpoint = server_url + "/functions/v1/check-health-metric-today?email=" + email;

  http.begin(endpoint);
  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);

    bool addedToday = doc["addedToday"];
    return addedToday;
  } else {
    Serial.printf("Failed to check metric status. HTTP code: %d\n", httpCode);
    return false;
  }

  http.end();
}

void checkHealthMetricToday(const String &email) {
  bool addedToday = hasDailyData(config.server_url, email);

  if (!addedToday) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("User hasn't added a metric today. LED ON.");
  } else {
    digitalWrite(LED_PIN, LOW);
    Serial.println("User has added a metric today. LED OFF.");
  }
}
