
---

# 项目 Prompt 文档：基于 ESP32 的华为手环心率广播接入系统

## 1. 项目概述

本项目旨在使用 ESP32 微控制器读取华为手环通过 BLE（蓝牙低功耗）广播的心率数据，并将数据通过串口或 Wi-Fi 转发到电脑端进行处理和显示。

**核心功能**：
- ESP32 作为 BLE 中心设备（客户端），扫描并连接华为手环
- 订阅手环的心率测量通知（Notifications）
- 解析标准 BLE 心率服务数据
- 通过串口或 Wi-Fi 将心率数据转发至电脑

## 2. 技术原理

华为手环的“心率广播”功能本质上是将手环模拟为标准 BLE 心率带，遵循蓝牙官方定义的 Heart Rate Profile (HRP)。

**关键 UUID**：
| 项目 | UUID | 说明 |
|------|------|------|
| 心率服务 | `0000180D-0000-1000-8000-00805F9B34FB` 或 `0x180D` | 标准心率服务 |
| 心率测量特征 | `00002A37-0000-1000-8000-00805F9B34FB` 或 `0x2A37` | 包含心率数据 |
| 客户端特征配置描述符 | `0x2902` | 用于启用 Notifications |

**数据格式**：心率测量特征返回的数据包中，第一个字节为标志位（Flags），第二个字节为心率值（8位，单位 bpm）。

## 3. 硬件要求

| 组件 | 型号/规格 | 备注 |
|------|-----------|------|
| ESP32 开发板 | ESP32-WROOM-32 系列或兼容板 | 必须支持 BLE |
| 华为手环 | 华为手环 6/7 及后续型号 | 需支持心率广播功能 |
| USB 数据线 | Micro USB 或 USB-C | 用于供电和串口通信 |

> 📌 根据社区反馈，大部分手环（小米 9 除外）的心率广播都走标准 BLE 0x180D 服务。华为手环验证可用。

## 4. 软件开发环境配置

### 4.1 Arduino IDE 环境搭建

1. **安装 Arduino IDE**（版本 1.8.x 以上）
2. **添加 ESP32 开发板支持**：
    - 打开 Arduino IDE → 文件 → 首选项
    - 在“附加开发板管理器网址”中添加：
      ```
      https://dl.espressif.com/dl/package_esp32_index.json
      ```
    - 参考来源：[CSDN ESP32 BLE客户端实战教程](https://blog.csdn.net/weixin_42713608/article/details/159906716)

3. **安装 ESP32 平台**：
    - 工具 → 开发板 → 开发板管理器
    - 搜索并安装 "esp32" 平台

4. **安装必要的 BLE 库**（Arduino 默认已包含，无需额外安装）：
   ```cpp
   #include <BLEDevice.h>
   #include <BLEUtils.h>
   #include <BLEScan.h>
   #include <BLEAdvertisedDevice.h>
   #include <BLEClient.h>
   ```

## 5. 代码架构设计

### 5.1 项目文件结构

```
esp32_huawei_heartrate/
├── esp32_huawei_heartrate.ino    // 主程序文件
├── config.h                       // 配置文件（Wi-Fi、MQTT等）
├── BLEHeartRateClient.h          // BLE 心率客户端类声明
├── BLEHeartRateClient.cpp        // BLE 心率客户端类实现
└── README.md                      // 项目说明文档
```

### 5.2 核心代码流程

```
初始化
    ↓
扫描 BLE 设备（过滤 UUID 0x180D 或设备名包含 "HUAWEI"）
    ↓
连接到手环
    ↓
发现服务 0x180D 和特征 0x2A37
    ↓
启用 Notifications（写入 0x2902 描述符）
    ↓
在回调函数中接收并解析心率数据
    ↓
通过串口打印 / Wi-Fi 发送到电脑
```

### 5.3 关键代码实现要点

#### 5.3.1 扫描并连接手环

```cpp
class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
    void onResult(BLEAdvertisedDevice advertisedDevice) {
        // 根据服务 UUID 或设备名称过滤
        if (advertisedDevice.haveServiceUUID() && 
            advertisedDevice.getServiceUUID().equals(BLEUUID("0x180D"))) {
            // 停止扫描，尝试连接
            advertisedDevice.getScan()->stop();
            connectToDevice(advertisedDevice);
        }
    }
};
```

#### 5.3.2 订阅心率通知

```cpp
// 在连接成功后，启用通知
pCharacteristic->registerForNotify(heartRateNotifyCallback);
```

#### 5.3.3 心率数据解析回调

```cpp
static void heartRateNotifyCallback(
    BLECharacteristic* pCharacteristic,
    uint8_t* pData,
    size_t length,
    bool isNotify) {
    // 数据格式: [Flags, HeartRateValue]
    if (length >= 2) {
        uint8_t heartRate = pData[1];  // 第二个字节为心率值
        Serial.printf("Heart Rate: %d bpm\n", heartRate);
        // 转发到电脑...
    }
}
```

## 6. 数据转发方式

### 6.1 方式一：串口转发（最简单）

将心率数据通过 Serial.print() 输出，电脑端使用串口助手或自定义程序读取。

### 6.2 方式二：Wi-Fi + MQTT（推荐）

参考社区已有的实现方案，通过 Wi-Fi 将数据发送到 MQTT Broker，电脑端订阅 MQTT 主题接收数据。

**MQTT 配置示例**：
```cpp
// config.h
#define WIFI_SSID "your_wifi_ssid"
#define WIFI_PASSWORD "your_wifi_password"
#define MQTT_BROKER "192.168.1.xxx"
#define MQTT_TOPIC "heartrate/huawei"
```

### 6.3 方式三：Web Server

ESP32 开启简易 Web 服务器，通过浏览器访问查看实时心率，并可选择要连接的手环设备。

## 7. 测试验证步骤

1. **开启手环心率广播**：在手环设置中找到并开启该功能
2. **烧录程序**：将代码上传到 ESP32
3. **打开串口监视器**（波特率 115200）：查看扫描和连接日志
4. **验证数据接收**：确认心率数值正常更新
5. **扩展功能测试**：测试 Wi-Fi 转发或 MQTT 接入

## 8. 参考资源与链接

| 资源 | 链接 | 说明 |
|------|------|------|
| ESP32 开发板配置 | https://dl.espressif.com/dl/package_esp32_index.json | Arduino IDE 开发板管理器 URL |
| ESP32 BLE 客户端实战教程 | https://blog.csdn.net/weixin_42713608/article/details/159906716 | 从零连接智能手环并读取心率数据 |
| HA 社区方案讨论 | https://bbs.hassbian.com/forum.php?mod=viewthread&tid=30528 | 手环心率广播接入 Home Assistant |
| 完整 HA 接入方案 | https://bbs.hassbian.com/thread-30627-1-51.html | 含 Web Server 和 MQTT 完整代码 |
| BLE 心率服务标准 UUID | 官方 Bluetooth SIG 规范 | 服务 0x180D，特征 0x2A37 |
| ESP32 BLE 外设示例 | https://learn.digilabdte.com/books/internet-of-things/page/69-practical-implementation-with-esp32/ | 心率传感器 BLE 服务实现 |
| BLE 心率监测系统 | https://cloud.tencent.cn/developer/article/2562625 | 蓝牙 4.0 协议与心率监测案例 |

## 9. 注意事项

1. **兼容性**：华为手环的心率广播使用标准 BLE 协议，兼容性较好。其他品牌手环（如小米 9 除外）也可能适用，需相应修改设备名过滤条件。
2. **连接限制**：开启心率广播后，手环会断开与手机的连接，仅作为 BLE 外设使用。
3. **功耗**：心率广播会增加手环耗电，建议仅在需要时开启。
4. **连接稳定性**：ESP32 和手环之间距离应保持在 5-10 米以内。
5. **数据格式**：心率数据的第二个字节是心率值（bpm），如需更精确的数据（如 RR 间期），需解析 Flags 字段判断是否包含额外数据。

## 10. 扩展方向

- 接入 Home Assistant：通过 MQTT 将数据发送到 HA，在仪表盘显示实时心率
- 心率异常报警：当心率超过设定阈值时触发报警
- 数据记录：将心率数据存储到 SD 卡或云端数据库
- OLED 显示：在 ESP32 上连接 OLED 屏幕本地显示心率