//
//  HealthAppApp.swift
//  HealthApp
//
//  Created by Max on 05.06.2025.
//

import SwiftUI

@main
struct HealthAppApp: App {
    // Later, you can inject an AuthService or similar here to manage auth state.
    // For now, we'll assume MainView handles the initial view logic.

    var body: some Scene {
        WindowGroup {
            MainView()
        }
    }
}
