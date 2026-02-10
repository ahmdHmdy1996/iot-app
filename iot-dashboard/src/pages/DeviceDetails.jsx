import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  Table,
  Typography,
  Spin,
  Alert,
  Row,
  Col,
  Tag,
  Statistic,
} from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ThunderboltOutlined, FieldTimeOutlined } from "@ant-design/icons";
import moment from "moment";
import api from "../services/api";

const { Title } = Typography;

const DeviceDetails = () => {
  const { imei } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.getHistory(imei, 50);

      // Handle response format: ensure it's an array
      // api.getHistory returns response.data directly due to interceptor
      // But we should verify if it's { success: true, data: [...] } or just [...]
      // Based on previous convos, backend might return array directly or object.
      // Let's assume standard response: { success: true, data: [...] } or just [...]
      // Safe check:
      let readings = [];
      if (Array.isArray(result)) {
        readings = result;
      } else if (result.data && Array.isArray(result.data)) {
        readings = result.data;
      }

      // Sort by timestamp asc for chart (oldest first)
      readings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      setData(readings);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setError("فشل في جلب البيانات history.");
    } finally {
      setLoading(false);
    }
  }, [imei]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30 seconds refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  // Table Columns
  const columns = [
    {
      title: "الوقت والتاريخ",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (text) => moment(text).format("YYYY-MM-DD HH:mm:ss"),
    },
    {
      title: "درجة الحرارة (°C)",
      dataIndex: "temperature",
      key: "temperature",
      render: (temp) => (
        <Tag color={temp > 25 ? "red" : temp < 10 ? "blue" : "green"}>
          {temp}°C
        </Tag>
      ),
    },
    {
      title: "الرطوبة (%)",
      dataIndex: "humidity",
      key: "humidity",
      render: (hum) => `${hum}%`,
    },
    {
      title: "حالة الطاقة",
      dataIndex: "powerStatus",
      key: "powerStatus",
      render: (status) => (
        <Tag color={status === "ON" ? "green" : "red"}>
          {status === "ON" ? "متصل" : "منقطع"}
        </Tag>
      ),
    },
  ];

  // Latest Reading for Statistics
  const latest = data.length > 0 ? data[data.length - 1] : null;

  if (loading && data.length === 0) {
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <Title level={2}>
        تفاصيل الجهاز: <span style={{ fontFamily: "monospace" }}>{imei}</span>
      </Title>

      {error && (
        <Alert
          message="خطأ"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="آخر درجة حرارة"
              value={latest ? latest.temperature : "-"}
              precision={1}
              valueStyle={{
                color: latest?.temperature > 25 ? "#cf1322" : "#3f8600",
              }}
              prefix={<ThunderboltOutlined />}
              suffix="°C"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="آخر رطوبة"
              value={latest ? latest.humidity : "-"}
              precision={1}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="آخر تحديث"
              value={latest ? moment(latest.timestamp).fromNow() : "-"}
              prefix={<FieldTimeOutlined />}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Chart Section */}
      <Card
        title="مخطط درجة الحرارة (آخر 50 قراءة)"
        style={{ marginBottom: 24 }}
      >
        <div style={{ height: 400, width: "100%" }}>
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(time) => moment(time).format("HH:mm")}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(label) =>
                  moment(label).format("YYYY-MM-DD HH:mm:ss")
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="temperature"
                name="درجة الحرارة"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="humidity"
                name="الرطوبة"
                stroke="#82ca9d"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Table Section */}
      <Card title="سجل القراءات">
        <Table
          dataSource={[...data].reverse()} // Show newest first in table
          columns={columns}
          rowKey="id" // Assuming ID exists, or use timestamp
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default DeviceDetails;
