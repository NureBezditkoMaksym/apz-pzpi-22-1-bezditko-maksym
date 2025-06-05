import SwiftUI

struct NotificationsView: View {
    @StateObject private var viewModel = NotificationViewModel()
    
    var body: some View {
        NavigationView {
            VStack {
                if viewModel.isLoading && viewModel.notifications.isEmpty {
                    ProgressView("Loading...")
                } else if let error = viewModel.errorMessage {
                    Text(error).foregroundColor(.red).padding()
                } else if viewModel.notifications.isEmpty {
                    Text("You have no notifications.").foregroundColor(.secondary)
                } else {
                    List {
                        ForEach(viewModel.notifications) { notification in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(notification.message)
                                Text(notification.sentAt?.formatted(date: .numeric, time: .shortened) ?? "Just now")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.vertical, 4)
                        }
                        .onDelete(perform: delete)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Notifications")
            .task {
                await viewModel.fetchNotifications()
            }
            .refreshable {
                await viewModel.fetchNotifications()
            }
        }
    }
    
    private func delete(at offsets: IndexSet) {
        Task {
            await viewModel.deleteNotification(at: offsets)
        }
    }
}

struct NotificationsView_Previews: PreviewProvider {
    static var previews: some View {
        NotificationsView()
    }
} 