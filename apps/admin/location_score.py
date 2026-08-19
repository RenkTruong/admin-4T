weights = {
    "demand_b2b": 0.35,
    "competitive_gap": 0.25,
    "route_visibility": 0.20,
    "rent_fit": 0.10,
    "operating_risk": 0.10,
}

# Điểm 1–5 là đánh giá có cơ sở từ dữ liệu công khai đã thu thập; không phải doanh thu dự báo.
candidates = {
    "Cửa ngõ hẻm 1014/88 – Tân Kỳ Tân Quý": {
        "demand_b2b": 5,
        "competitive_gap": 4,
        "route_visibility": 4,
        "rent_fit": 4,
        "operating_risk": 4,
    },
    "Đường số 3 / rìa Green Town – KDC Vĩnh Lộc": {
        "demand_b2b": 4,
        "competitive_gap": 2,
        "route_visibility": 4,
        "rent_fit": 3,
        "operating_risk": 4,
    },
    "Đường số 6 – cụm trường Hoàng Văn Thụ": {
        "demand_b2b": 4,
        "competitive_gap": 3,
        "route_visibility": 3,
        "rent_fit": 3,
        "operating_risk": 4,
    },
    "Liên Khu 4–5 – mặt tiền cùng vùng 109A": {
        "demand_b2b": 4,
        "competitive_gap": 1,
        "route_visibility": 5,
        "rent_fit": 3,
        "operating_risk": 2,
    },
    "Kênh Nước Đen – cụm trường 69/76": {
        "demand_b2b": 3,
        "competitive_gap": 2,
        "route_visibility": 3,
        "rent_fit": 3,
        "operating_risk": 3,
    },
}

ranked = []
for name, scores in candidates.items():
    total = sum(scores[k] * weights[k] for k in weights)
    ranked.append((name, round(total, 2), scores))

ranked.sort(key=lambda x: x[1], reverse=True)
for rank, (name, total, scores) in enumerate(ranked, 1):
    print(rank, name, total, scores)
