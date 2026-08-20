import Combine
import Foundation
import Network

/// Live view of the radio, used for the offline banner and Wi-Fi-only downloads.
final class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()

    @Published private(set) var online: Bool = true
    @Published private(set) var wifi: Bool = true
    @Published private(set) var cellular: Bool = false

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "app.serika.musicy.network")

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.online = path.status == .satisfied
                self?.wifi = path.usesInterfaceType(.wifi) || path.usesInterfaceType(.wiredEthernet)
                self?.cellular = path.usesInterfaceType(.cellular)
            }
        }
        monitor.start(queue: queue)
    }
}
