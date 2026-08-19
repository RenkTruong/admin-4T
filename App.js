import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [weight, setWeight] = useState('0');
  const [iron, setIron] = useState('0');
  const [delivery, setDelivery] = useState('0');
  const [total, setTotal] = useState(0);
  const [orders, setOrders] = useState([]);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);

  // Tính tổng tiền tự động
  useEffect(() => {
    const w = parseFloat(weight) || 0;
    const i = parseInt(iron) || 0;
    const d = parseInt(delivery) || 0;
    setTotal((w * 15000) + (i * 10000) + d);
  }, [weight, iron, delivery]);

  const handleOrder = () => {
    if (!phone || phone.length !== 10) {
      Alert.alert("Lỗi", "Số điện thoại phải đủ 10 số!");
      return;
    }
    if (address.length < 10) {
      Alert.alert("Lỗi", "Địa chỉ chi tiết tối thiểu 10 ký tự!");
      return;
    }
    if (total <= 0) {
      Alert.alert("Lỗi", "Vui lòng chọn khối lượng giặt hoặc số lượng ủi!");
      return;
    }

    const newOrder = {
      id: "DH" + Math.floor(1000 + Math.random() * 9000),
      name,
      phone,
      address,
      total,
      status: "Chờ tiếp nhận",
      date: new Date().toLocaleDateString('vi-VN')
    };

    setCurrentOrder(newOrder);
    setPaymentModal(true);
  };

  const confirmPayment = () => {
    setOrders([currentOrder, ...orders]);
    setPaymentModal(false);
    Alert.alert("Thành công", `Đã tạo đơn hàng ${currentOrder.id} thành công!`);
    setActiveTab('history');
  };

  return (
    <View style={styles.container}>
      {/* Header App */}
      <View style={styles.header}>
        <Text style={styles.logo}>4T <Text style={{color: '#29b6f6'}}>GIẶT SẤY</Text></Text>
      </View>

      {/* Nội dung thay đổi theo Tab */}
      <ScrollView style={styles.body}>
        {activeTab === 'home' && (
          <View>
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>GIẶT SẤY CHUẨN NHẬT BẢN</Text>
              <Text style={styles.heroSubtitle}>Thơm sạch mỗi ngày – Tiện lợi mỗi lần</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Công Nghệ Nổi Bật</Text>
              <Text style={styles.textItem}>🌀 Giặt Sạch Sâu bằng sóng siêu âm</Text>
              <Text style={styles.textItem}>♨️ Sấy Khô Nhanh Heatpump chống nhăn[cite: 1]</Text>
              <Text style={styles.textItem}>🛡️ Diệt Khuẩn UV 99.9% bảo vệ sợi vải[cite: 1]</Text>
            </View>
          </View>
        )}

        {activeTab === 'order' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tạo Đơn Hàng Dịch Vụ</Text>
            
            <Text style={styles.label}>Họ và tên:</Text>
            <TextInput style={styles.input} placeholder="Nhập họ tên" value={name} onChangeText={setName} />

            <Text style={styles.label}>Số điện thoại (10 số):</Text>
            <TextInput style={styles.input} placeholder="VD: 0909123456" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} />

            <Text style={styles.label}>Địa chỉ giao nhận:</Text>
            <TextInput style={styles.input} placeholder="Nhập địa chỉ chi tiết" value={address} onChangeText={setAddress} />

            <Text style={styles.label}>Giặt & Sấy khô (15,000đ/kg):</Text>
            <TextInput style={styles.input} placeholder="Số kg" keyboardType="numeric" value={weight} onChangeText={setWeight} />

            <Text style={styles.label}>Ủi hơi nước (10,000đ/cái):</Text>
            <TextInput style={styles.input} placeholder="Số lượng cái" keyboardType="numeric" value={iron} onChangeText={setIron} />

            <Text style={styles.totalText}>Tổng tiền: {total.toLocaleString('vi-VN')} VNĐ</Text>

            <TouchableOpacity style={styles.btnSubmit} onPress={handleOrder}>
              <Text style={styles.btnText}>Xác Nhận Đặt Đơn</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Lịch Sử Đơn Hàng</Text>
            {orders.length === 0 ? (
              <Text style={{textAlign: 'center', color: '#64748b', marginTop: 10}}>Chưa có đơn hàng nào.</Text>
            ) : (
              orders.map((o, index) => (
                <View key={index} style={styles.orderItem}>
                  <Text style={{fontWeight: 'bold'}}>Mã đơn: {o.id} - <Text style={{color: '#e11d48'}}>{o.status}</Text></Text>
                  <Text style={{fontSize: 12, color: '#64748b'}}>Địa chỉ: {o.address}</Text>
                  <Text style={{fontSize: 13, fontWeight: 'bold', marginTop: 5}}>Thành tiền: {o.total.toLocaleString()} VNĐ</Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal QR Thanh Toán */}
      <Modal visible={paymentModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.sectionTitle}>Quét Mã QR Thanh Toán</Text>
            <Text style={{textAlign: 'center', marginVertical: 10, fontSize: 13, color: '#64748b'}}>
              Chuyển khoản số tiền: {currentOrder?.total.toLocaleString()} VNĐ[cite: 1]
            </Text>
            <TouchableOpacity style={[styles.btnSubmit, {backgroundColor: '#16a34a'}]} onPress={confirmPayment}>
              <Text style={styles.btnText}>Tôi Đã Hoàn Tất Thanh Toán</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => setActiveTab('home')}><Text style={styles.navText}>🏠 Trang Chủ</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('order')}><Text style={styles.navText}>📦 Đặt Đơn</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('history')}><Text style={styles.navText}>📋 Lịch Sử</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#ffffff', paddingTop: 40, paddingBottom: 15, alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  logo: { fontSize: 20, fontWeight: 'bold', color: '#0f4c81' },
  body: { flex: 1, padding: 15 },
  hero: { backgroundColor: '#0f4c81', padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  heroTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  heroSubtitle: { color: '#e0f2fe', fontSize: 12, marginTop: 5, fontStyle: 'italic' },
  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 10, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f4c81', marginBottom: 10 },
  textItem: { fontSize: 13, color: '#334155', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4, color: '#1e293b' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 8, marginBottom: 10, fontSize: 13 },
  totalText: { fontSize: 15, fontWeight: 'bold', color: '#e11d48', marginVertical: 10 },
  btnSubmit: { backgroundColor: '#16a34a', padding: 12, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  navBar: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#ffffff', paddingVertical: 12, borderTopWidth: 1, borderColor: '#e2e8f0' },
  navText: { fontSize: 13, fontWeight: '600', color: '#0f4c81' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#ffffff', padding: 20, borderRadius: 10, alignItems: 'center' },
  orderItem: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, padding: 10, marginBottom: 10, backgroundColor: '#f8fafc' }
});