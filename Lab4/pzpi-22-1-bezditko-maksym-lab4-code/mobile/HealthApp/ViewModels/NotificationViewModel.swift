import Foundation
import Combine

@MainActor
class NotificationViewModel: ObservableObject {
    @Published var notifications: [AppNotification] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let notificationService = NotificationService.shared

    func fetchNotifications() async {
        isLoading = true
        errorMessage = nil
        do {
            self.notifications = try await notificationService.fetchNotifications()
        } catch {
            self.errorMessage = "Failed to fetch notifications: \(error.localizedDescription)"
        }
        isLoading = false
    }
    
    func deleteNotification(at offsets: IndexSet) async {
        let notificationsToDelete = offsets.map { self.notifications[$0] }
        
        // Optimistically remove from UI
        self.notifications.remove(atOffsets: offsets)
        
        for notification in notificationsToDelete {
            do {
                try await notificationService.deleteNotification(id: notification.id)
            } catch {
                self.errorMessage = "Failed to delete notification: \(error.localizedDescription)"
                await fetchNotifications() // Re-sync on failure
                break
            }
        }
    }
} 