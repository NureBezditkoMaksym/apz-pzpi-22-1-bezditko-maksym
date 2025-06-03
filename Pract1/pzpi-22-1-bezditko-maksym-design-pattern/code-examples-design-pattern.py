# Product
class Burger:
    def __init__(self):
        self.parts = []

    def add(self, part):
        self.parts.append(part)

    def describe(self):
        return "Burger with: " + ", ".join(self.parts)


# Builder
class BurgerBuilder:
    def __init__(self):
        self.burger = Burger()

    def add_bun(self):
        self.burger.add("bun")
        return self

    def add_patty(self):
        self.burger.add("beef patty")
        return self

    def add_lettuce(self):
        self.burger.add("lettuce")
        return self

    def add_cheese(self):
        self.burger.add("cheese")
        return self

    def build(self):
        return self.burger


# Director (optional)
class BurgerDirector:
    def __init__(self, builder):
        self.builder = builder

    def make_classic_burger(self):
        return self.builder.add_bun().add_patty().add_lettuce().add_cheese().build()


# Usage
if __name__ == "__main__":
    builder = BurgerBuilder()
    director = BurgerDirector(builder)
    burger = director.make_classic_burger()
    print(burger.describe())
