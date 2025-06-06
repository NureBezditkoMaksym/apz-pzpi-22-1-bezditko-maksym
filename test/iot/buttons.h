#ifndef BUTTONS_H
#define BUTTONS_H

#include <ezButton.h>
#include "config.h"
#include "api.h"

#define DEBOUNCE_TIME 50

extern ezButton button1;
extern ezButton button2;
extern ezButton button3;

void initializeButtons();
void handleButtonEvents();

#endif
