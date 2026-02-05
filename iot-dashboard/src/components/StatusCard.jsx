import React from "react";
import { Card, Statistic, Badge, Row, Col, Typography, Space } from "antd";
import {
  ThunderboltOutlined,
  WifiOutlined,
  DisconnectOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import moment from "moment";
import {
  STATUS_COLORS,
  TEMP_WARNING_THRESHOLD,
  TEMP_CRITICAL_THRESHOLD,
} from "../config/constants";

const { Text } = Typography;

/**
 * StatusCard Component
 * Displays device status with temperature, humidity, battery, and online status
 */
const StatusCard = ({
  deviceName,
  temperature,
  humidity,
  voltage,
  isOnline,
  lastUpdated,
}) => {
  // Determine status based on temperature and online state
  const getStatus = () => {
    if (!isOnline) return "OFFLINE";
    if (temperature > TEMP_CRITICAL_THRESHOLD) return "CRITICAL";
    if (temperature > TEMP_WARNING_THRESHOLD) return "WARNING";
    return "NORMAL";
  };

  const status = getStatus();
  const statusColor = STATUS_COLORS[status];

  return (
    <Card
      hoverable
      style={{
        borderColor: statusColor,
        borderWidth: status === "CRITICAL" ? 3 : 1,
        opacity: isOnline ? 1 : 0.6,
      }}
    >
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Text strong style={{ fontSize: 18 }}>
            {deviceName || "جهاز غير مسمى"}
          </Text>
        </Col>
        <Col>
          <Badge
            status={isOnline ? "success" : "default"}
            text={isOnline ? "متصل" : "غير متصل"}
          />
        </Col>
      </Row>

      {/* Temperature Display */}
      <Row justify="center" style={{ marginBottom: 20 }}>
        <Col>
          <Statistic
            value={temperature}
            precision={1}
            suffix="°C"
            valueStyle={{
              color: statusColor,
              fontSize: 48,
              fontWeight: "bold",
            }}
          />
        </Col>
      </Row>

      {/* Alert Badge for Critical/Warning */}
      {(status === "CRITICAL" || status === "WARNING") && (
        <Row justify="center" style={{ marginBottom: 16 }}>
          <Badge
            count={status === "CRITICAL" ? "تنبيه حرج!" : "تحذير"}
            style={{
              backgroundColor: statusColor,
            }}
          />
        </Row>
      )}

      {/* Humidity, Battery, and Last Update */}
      <Row gutter={16}>
        <Col span={8}>
          <Space direction="vertical" size={0}>
            <Text type="secondary">الرطوبة</Text>
            <Text strong>{humidity ? `${humidity}%` : "-"}</Text>
          </Space>
        </Col>
        <Col span={8}>
          <Space direction="vertical" size={0}>
            <Text type="secondary">البطارية</Text>
            <Space>
              <ThunderboltOutlined />
              <Text strong>{voltage ? `${voltage}V` : "-"}</Text>
            </Space>
          </Space>
        </Col>
        <Col span={8}>
          <Space direction="vertical" size={0}>
            <Text type="secondary">آخر تحديث</Text>
            <Text strong style={{ fontSize: 12 }}>
              {moment(lastUpdated).format("HH:mm")}
            </Text>
          </Space>
        </Col>
      </Row>

      {/* Offline Warning */}
      {!isOnline && (
        <Row justify="center" style={{ marginTop: 16 }}>
          <Space>
            <DisconnectOutlined style={{ color: STATUS_COLORS.OFFLINE }} />
            <Text type="secondary">
              آخر اتصال: {moment(lastUpdated).fromNow()}
            </Text>
          </Space>
        </Row>
      )}
    </Card>
  );
};

export default StatusCard;
