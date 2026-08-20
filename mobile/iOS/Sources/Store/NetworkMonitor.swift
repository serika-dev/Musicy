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
    private let lock = NSLock()
    private var snapshot = (online: true, wifi: true, cellular: false)

    /// Thread-safe reads for the API / download path, which are not on the main actor.
    var isOnline: Bool { lock.lock(); defer { lock.unlock() }; return snapshot.online }
    var isWifi: Bool { lock.lock(); defer { lock.unlock() }; return snapshot.wifi }
    var isCellular: Bool { lock.lock(); defer { lock.unlock() }; return snapshot.cellular }

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let online = path.status == .satisfied
            let wifi = path.usesInterfaceType(.wifi) || path.usesInterfaceType(.wiredEthernet)
            let cellular = path.usesInterfaceType(.cellular)
            DispatchQueue.main.async {
                guard let self else { return }
                self.lock.lock()
                self.snapshot = (online, wifi, cellular)
                self.lock.unlock()
                self.online = online
                self.wifi = wifi
                self.cellular = cellular
            }
        }
        monitor.start(queue: queue)
    }
}
