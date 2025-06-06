#include "buttons.h"

ezButton button1(4);
ezButton button2(5);
ezButton button3(23);

void initializeButtons() {
  button1.setDebounceTime(DEBOUNCE_TIME);
  button2.setDebounceTime(DEBOUNCE_TIME);
  button3.setDebounceTime(DEBOUNCE_TIME);
}

void handleButtonEvents() {
  button1.loop();
  button2.loop();
  button3.loop();

  if (button1.isReleased()) {
    Serial.println("Button 1 pressed");
    updateHealthMetric(config.server_url, config.email, 300, 0, 0);
  } else if (button2.isReleased()) {
    Serial.println("Button 2 pressed");
    updateHealthMetric(config.server_url, config.email, 0, 200, 0);
  } else if (button3.isReleased()) {
    Serial.println("Button 3 pressed");
    updateHealthMetric(config.server_url, config.email, 0, 0, 1000);
  }
}
