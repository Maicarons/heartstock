/*
 * ESP32 华为手环心率读取器
 *
 * 功能：
 * - 扫描 BLE 设备，查找华为手环（服务 UUID 0x180D）
 * - 连接手环并订阅心率测量通知
 * - 通过串口输出心率数据
 *
 * 硬件：ESP32 开发板 + 华为手环 9
 */

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <BLEClient.h>

// BLE 心率服务 UUID
static BLEUUID heartRateServiceUUID("0000180d-0000-1000-8000-00805f9b34fb");
// 心率测量特征 UUID
static BLEUUID heartRateCharUUID("00002a37-0000-1000-8000-00805f9b34fb");
// 客户端特征配置描述符 UUID (用于启用通知)
static BLEUUID clientCharConfigUUID("00002902-0000-1000-8000-00805f9b34fb");

// 全局变量
static BLEClient* pClient = nullptr;
static BLERemoteCharacteristic* pHeartRateChar = nullptr;
static bool doConnect = false;
static bool connected = false;
static BLEAdvertisedDevice* myDevice = nullptr;

// 心率数据回调函数
static void heartRateNotifyCallback(
    BLERemoteCharacteristic* pBLERemoteCharacteristic,
    uint8_t* pData,
    size_t length,
    bool isNotify) {

    if (length >= 2) {
        // 数据格式: [Flags, HeartRateValue]
        uint8_t flags = pData[0];
        uint8_t heartRate = pData[1];

        // 如果 Flags 的 bit 0 为 0，心率值为 uint8 (1 字节)
        // 如果 Flags 的 bit 0 为 1，心率值为 uint16 (2 字节)
        if ((flags & 0x01) && length >= 3) {
            // uint16 格式
            heartRate = pData[1] | (pData[2] << 8);
        }

        // 输出心率数据（JSON 格式，方便电脑端解析）
        Serial.printf("{\"heartRate\": %d, \"timestamp\": %lu}\n",
                      heartRate, millis());
    }
}

// 连接到设备
bool connectToServer() {
    Serial.print("正在连接到 ");
    Serial.println(myDevice->getAddress().toString().c_str());

    pClient = BLEDevice::createClient();
    Serial.println(" - 已创建客户端");

    // 连接到远程 BLE 设备
    if (!pClient->connect(myDevice)) {
        Serial.println(" - 连接失败!");
        return false;
    }
    Serial.println(" - 已连接到服务器");

    // 获取心率服务
    BLERemoteService* pRemoteService = pClient->getService(heartRateServiceUUID);
    if (pRemoteService == nullptr) {
        Serial.println(" - 找不到心率服务");
        pClient->disconnect();
        return false;
    }
    Serial.println(" - 已找到心率服务");

    // 获取心率测量特征
    pHeartRateChar = pRemoteService->getCharacteristic(heartRateCharUUID);
    if (pHeartRateChar == nullptr) {
        Serial.println(" - 找不到心率测量特征");
        pClient->disconnect();
        return false;
    }
    Serial.println(" - 已找到心率测量特征");

    // 注册通知回调
    if (pHeartRateChar->canNotify()) {
        pHeartRateChar->registerForNotify(heartRateNotifyCallback);
        Serial.println(" - 已注册心率通知");
    } else {
        Serial.println(" - 心率特征不支持通知!");
        pClient->disconnect();
        return false;
    }

    connected = true;
    return true;
}

// 扫描回调类
class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
    void onResult(BLEAdvertisedDevice advertisedDevice) {
        Serial.print("发现设备: ");
        Serial.print(advertisedDevice.getName().c_str());
        Serial.print(" (");
        Serial.print(advertisedDevice.getAddress().toString().c_str());
        Serial.print(")");

        // 检查是否包含心率服务 UUID
        if (advertisedDevice.haveServiceUUID() &&
            advertisedDevice.isAdvertisingService(heartRateServiceUUID)) {
            Serial.println(" [包含心率服务!]");

            // 停止扫描
            BLEDevice::getScan()->stop();

            // 保存设备信息
            myDevice = new BLEAdvertisedDevice(advertisedDevice);
            doConnect = true;
        } else {
            Serial.println();
        }
    }
};

void setup() {
    // 初始化串口
    Serial.begin(115200);
    Serial.println();
    Serial.println("========================================");
    Serial.println("ESP32 华为手环心率读取器");
    Serial.println("========================================");
    Serial.println();

    // 初始化 BLE
    Serial.println("初始化 BLE...");
    BLEDevice::init("ESP32-HeartRate");

    // 创建扫描对象
    BLEScan* pBLEScan = BLEDevice::getScan();
    pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
    pBLEScan->setActiveScan(true);
    pBLEScan->setInterval(100);
    pBLEScan->setWindow(99);

    Serial.println("开始扫描 BLE 设备...");
    Serial.println("正在查找包含心率服务 (0x180D) 的设备...");
    Serial.println();

    // 开始扫描（持续扫描，直到找到设备）
    pBLEScan->start(0, false);
}

void loop() {
    // 如果找到设备，尝试连接
    if (doConnect) {
        if (connectToServer()) {
            Serial.println("========================================");
            Serial.println("已连接到华为手环!");
            Serial.println("等待心率数据...");
            Serial.println("========================================");
        } else {
            Serial.println("连接失败，重新扫描...");
            doConnect = false;
            // 重新开始扫描
            BLEDevice::getScan()->start(0, false);
        }
        doConnect = false;
    }

    // 如果已连接，检查连接状态
    if (connected) {
        if (!pClient->isConnected()) {
            Serial.println("连接断开，重新扫描...");
            connected = false;
            pHeartRateChar = nullptr;
            // 重新开始扫描
            BLEDevice::getScan()->start(0, false);
        }
    }

    delay(1000);
}
