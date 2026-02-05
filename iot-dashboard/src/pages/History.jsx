import React, { useState, useEffect } from "react";
import {
  Layout,
  Typography,
  Spin,
  Alert,
  Card,
  Table,
  Button,
  Space,
  Select,
} from "antd";
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import moment from "moment";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import apiService from "../services/api";
import { CHART_COLORS } from "../config/constants";

const { Content } = Layout;
const { Title } = Typography;
const { Option } = Select;

/**
 * History Page
 * Shows historical data with charts and export functionality
 */
const History = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(50);

  /**
   * Fetch historical data
   */
  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getHistory(limit);
      setData(response.readings || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching history:", err);
      setError(err.message || "فشل في جلب البيانات التاريخية");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [limit]);

  /**
   * Export to Excel
   */
  const exportToExcel = () => {
    const exportData = data.map((item) => ({
      التاريخ: moment(item.timestamp).format("YYYY-MM-DD"),
      الوقت: moment(item.timestamp).format("HH:mm:ss"),
      "الحرارة (°C)": item.temperature,
      "الرطوبة (%)": item.humidity || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "البيانات");
    XLSX.writeFile(
      wb,
      `temperature-data-${moment().format("YYYY-MM-DD")}.xlsx`
    );
  };

  /**
   * Export to PDF
   */
  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text("Temperature Monitoring Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${moment().format("YYYY-MM-DD HH:mm")}`, 14, 22);

    // Table
    const tableData = data.map((item) => [
      moment(item.timestamp).format("YYYY-MM-DD"),
      moment(item.timestamp).format("HH:mm:ss"),
      `${item.temperature}°C`,
      item.humidity ? `${item.humidity}%` : "-",
    ]);

    doc.autoTable({
      head: [["Date", "Time", "Temperature", "Humidity"]],
      body: tableData,
      startY: 25,
    });

    doc.save(`temperature-report-${moment().format("YYYY-MM-DD")}.pdf`);
  };

  // Chart data formatting
  const chartData = data.map((item) => ({
    time: moment(item.timestamp).format("HH:mm"),
    temperature: item.temperature,
    humidity: item.humidity,
  }));

  // Table columns
  const columns = [
    {
      title: "التاريخ",
      dataIndex: "timestamp",
      key: "date",
      render: (timestamp) => moment(timestamp).format("YYYY-MM-DD"),
    },
    {
      title: "الوقت",
      dataIndex: "timestamp",
      key: "time",
      render: (timestamp) => moment(timestamp).format("HH:mm:ss"),
    },
    {
      title: "الحرارة (°C)",
      dataIndex: "temperature",
      key: "temperature",
      render: (temp) => (
        <strong style={{ color: temp > 10 ? "#ff4d4f" : "#52c41a" }}>
          {temp}°C
        </strong>
      ),
    },
    {
      title: "الرطوبة (%)",
      dataIndex: "humidity",
      key: "humidity",
      render: (humidity) => (humidity ? `${humidity}%` : "-"),
    },
  ];

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
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Content style={{ padding: 24 }}>
        {/* Header */}
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title level={2} style={{ margin: 0 }}>
              📊 السجل والتحليلات
            </Title>
            <Space>
              <Select value={limit} onChange={setLimit} style={{ width: 150 }}>
                <Option value={10}>آخر 10 قراءات</Option>
                <Option value={50}>آخر 50 قراءة</Option>
                <Option value={100}>آخر 100 قراءة</Option>
                <Option value={500}>آخر 500 قراءة</Option>
              </Select>
              <Button
                icon={<FileExcelOutlined />}
                onClick={exportToExcel}
                type="primary"
              >
                تصدير Excel
              </Button>
              <Button icon={<FilePdfOutlined />} onClick={exportToPDF}>
                تصدير PDF
              </Button>
            </Space>
          </div>

          {/* Chart */}
          <Card title="الرسم البياني - آخر 24 ساعة">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  label={{
                    value: "الوقت",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "الحرارة (°C)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "الرطوبة (%)",
                    angle: 90,
                    position: "insideRight",
                  }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke={CHART_COLORS.TEMPERATURE}
                  name="الحرارة"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  stroke={CHART_COLORS.HUMIDITY}
                  name="الرطوبة"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Data Table */}
          <Card title={`جدول البيانات (${data.length} قراءة)`}>
            <Table
              columns={columns}
              dataSource={data}
              rowKey="timestamp"
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Space>
      </Content>
    </Layout>
  );
};

export default History;
