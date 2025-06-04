#ifndef TASKS_H
#define TASKS_H

#include "config.h"
#include "api.h"
#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

#define CHECK_INTERVAL 10000

extern TaskHandle_t healthCheckTaskHandle;

void startHealthCheckTask();
void healthCheckTask(void *parameter);

#endif
