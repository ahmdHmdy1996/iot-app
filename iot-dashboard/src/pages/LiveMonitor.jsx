import React, { useState, useEffect } from "react";
import { Layout, Typography, Spin, Alert, Row, Col, Space } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import moment from "moment";
import StatusCard from "../components/StatusCard";
import apiService from "../services/api";
import { REFRESH_INTERVAL, OFFLINE_THRESHOLD } from "../config/constants";

const { Content } = Layout;
const { Title } = Typography;

/**
 * LiveMonitor Page
 * Main dashboard showing current device status with auto-refresh
 */
const LiveMonitor = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  /**
   * Fetch current device status
   */
  const fetchData = async () => {
    try {
      setError(null);
      const response = await apiService.getCurrentStatus();

      // Calculate if device is online
      const now = new Date();
      const lastUpdateTime = new Date(response.last_updated);
      const timeDiff = now - lastUpdateTime;
      const isOnline = timeDiff < OFFLINE_THRESHOLD;

      setData({
        ...response,
        status: {
          ...response.status,
          is_online: isOnline,
        },
      });

      setLastRefresh(new Date());
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message || "فشل في جلب البيانات");
      setLoading(false);
    }
  };

  /**
   * Setup auto-refresh
   */
  useEffect(() => {
    // Initial fetch
    fetchData();

    // Setup interval for auto-refresh
    const interval = setInterval(fetchData, REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Layout style={{ minHeight: "100vh", padding: 24 }}>
        <Content style={{ textAlign: "center", paddingTop: 100 }}>
          <Spin size="large" tip="جاري تحميل البيانات..." />
        </Content>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={{ minHeight: "100vh", padding: 24 }}>
        <Content>
          <Alert
            message="خطأ في الاتصال"
            description={error}
            type="error"
            showIcon
            action={
              <ReloadOutlined
                onClick={fetchData}
                style={{ fontSize: 20, cursor: "pointer" }}
              />
            }
          />
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
              <span style={{ color: "#8c8c8c" }}>
                آخر تحديث:{" "}
                {lastRefresh ? moment(lastRefresh).format("HH:mm:ss") : "-"}
              </span>
              <ReloadOutlined
                onClick={fetchData}
                style={{ fontSize: 18, cursor: "pointer", color: "#1890ff" }}
                spin={loading}
              />
            </Space>
          </Col>
        </Row>

        {/* Device Status Card */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={12} lg={8}>
            <StatusCard
              deviceName={data?.device_name}
              temperature={data?.status?.temperature}
              humidity={data?.status?.humidity}
              voltage={data?.status?.voltage}
              isOnline={data?.status?.is_online}
              lastUpdated={data?.last_updated}
            />
          </Col>
        </Row>

        {/* Auto-refresh Info */}
        <Row style={{ marginTop: 24 }}>
          <Col span={24}>
            <Alert
              message="التحديث التلقائي مفعل"
              description={`يتم تحديث البيانات تلقائياً كل ${
                REFRESH_INTERVAL / 1000
              } ثانية`}
              type="info"
              showIcon
              closable
            />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default LiveMonitor;
