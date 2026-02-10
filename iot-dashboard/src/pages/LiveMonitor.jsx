import React, { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Spin,
  Alert,
  Row,
  Col,
  Space,
  Select,
  Empty,
  Button,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import moment from "moment";
import StatusCard from "../components/StatusCard";
import apiService from "../services/api";
import { REFRESH_INTERVAL, OFFLINE_THRESHOLD } from "../config/constants";

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

/**
 * LiveMonitor Page
 * Main dashboard showing current device status with auto-refresh
 */
const LiveMonitor = () => {
  const [devices, setDevices] = useState([]);
  const [selectedImei, setSelectedImei] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true); // Initial loading
  const [refreshing, setRefreshing] = useState(false); // Background refresh
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  /**
   * 1. Fetch User's Devices on Mount
   */
  useEffect(() => {
    const init = async () => {
      try {
        const res = await apiService.getDevices();
        const deviceList = res.data || []; // api.js returns { data: [] }
        setDevices(deviceList);

        if (deviceList.length > 0) {
          setSelectedImei(deviceList[0].imei);
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
        setError("فشل في جلب قائمة الأجهزة");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  /**
   * 2. Fetch Status when selectedImei changes or refresh is triggered
   */
  const fetchData = async () => {
    if (!selectedImei) return;

    try {
      setRefreshing(true);
      setError(null);

      const response = await apiService.getReading(selectedImei);
      // Response structure from backend: { success, device: {...}, readings: [...] }
      // We need to adapt it to what StatusCard expects
      // StatusCard expects: { device_name, status: { temperature, humidity, voltage, is_online }, last_updated }

      const latestReading =
        response.readings && response.readings.length > 0
          ? response.readings[0]
          : null;
      const device = response.device || {};

      if (!latestReading) {
        setData({
          device_name: device.name || "Unknown",
          status: { is_online: false },
          last_updated: null,
        });
      } else {
        // Calculate if device is online
        const now = new Date();
        const lastUpdateTime = new Date(latestReading.timestamp);
        const timeDiff = now - lastUpdateTime;
        const isOnline = timeDiff < OFFLINE_THRESHOLD;

        setData({
          device_name: device.name,
          status: {
            temperature: latestReading.temperature,
            humidity: latestReading.humidity,
            voltage: latestReading.voltage,
            is_online: isOnline,
          },
          last_updated: latestReading.timestamp,
        });
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message || "فشل في جلب البيانات");
    } finally {
      setRefreshing(false);
    }
  };

  // Trigger fetch when selectedImei changes
  useEffect(() => {
    if (selectedImei) {
      fetchData();
    }
  }, [selectedImei]);

  // Setup interval for auto-refresh
  useEffect(() => {
    if (!selectedImei) return;
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [selectedImei]);

  if (loading) {
    return (
      <Layout style={{ minHeight: "100vh", padding: 24 }}>
        <Content style={{ textAlign: "center", paddingTop: 100 }}>
          <Spin size="large" tip="جاري تحميل الأجهزة..." />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Content style={{ padding: 24 }}>
        {/* Header */}
        <Row
          justify="space-between"
          align="middle"
          style={{ marginBottom: 24 }}
        >
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              🌡️ لوحة المراقبة الحية
            </Title>
          </Col>
          <Col>
            <Space>
              <Select
                value={selectedImei}
                onChange={setSelectedImei}
                style={{ width: 250 }}
                placeholder="اختر جهاز للمراقبة"
              >
                {devices.map((d) => (
                  <Option key={d.imei} value={d.imei}>
                    {d.name} ({d.imei})
                  </Option>
                ))}
              </Select>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchData}
                loading={refreshing}
              />
            </Space>
          </Col>
        </Row>

        {error && (
          <Alert
            message="خطأ"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {!selectedImei ? (
          <Empty description="لا توجد أجهزة لعرضها" />
        ) : (
          <>
            <div
              style={{ marginBottom: 16, textAlign: "left", color: "#8c8c8c" }}
            >
              آخر تحديث:{" "}
              {lastRefresh ? moment(lastRefresh).format("HH:mm:ss") : "-"}
            </div>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={24} md={12} lg={8}>
                {data ? (
                  <StatusCard
                    deviceName={data.device_name}
                    temperature={data.status?.temperature}
                    humidity={data.status?.humidity}
                    voltage={data.status?.voltage}
                    isOnline={data.status?.is_online}
                    lastUpdated={data.last_updated}
                  />
                ) : (
                  <Card loading={true} />
                )}
              </Col>
            </Row>

            <Row style={{ marginTop: 24 }}>
              <Col span={24}>
                <Alert
                  message="التحديث التلقائي مفعل"
                  description={`يتم تحديث البيانات تلقائياً كل ${REFRESH_INTERVAL / 1000} ثانية`}
                  type="info"
                  showIcon
                  closable
                />
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
};

export default LiveMonitor;
