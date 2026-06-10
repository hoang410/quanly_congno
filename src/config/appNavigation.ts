export type AppModuleId =
    | "dashboard"
    | "products"
    | "customers"
    | "salesOrders"
    | "returns"
    | "payments"
    | "dailyChanges";

export type AppNavigationItem = {
    id: AppModuleId;
    label: string;
    group: string;
    description: string;
    isReady: boolean;
}

export const appNavigationItems: AppNavigationItem[] = [
    {
        id: "dashboard",
        label: "Tổng quan",
        group: "Tổng quan",
        description: "Theo dõi nhanh công nợ, doanh số và phát sinh trong kỳ",
        isReady: true
    },
    {
        id: "products",
        label: "Sản phẩm",
        group: "Danh mục",
        description: "Quản lý danh sách sản phẩm đang kinh doanh",
        isReady: true
    },
    {
        id: "customers",
        label: "Khách hàng",
        group: "Danh mục",
        description: "Quản lý hồ sơ khách hàng và công nợ",
        isReady: true
    },
    {
        id: "salesOrders",
        label: "Đơn bán",
        group: "Bán hàng",
        description: "Ghi nhận đơn bán theo khách hàng",
        isReady: true
    },
    {
        id: "returns",
        label: "Trả hàng",
        group: "Bán hàng",
        description: "Ghi nhận hàng trả theo khách hàng",
        isReady: true
    },
    {
        id: "payments",
        label: "Thanh toán",
        group: "Tài chính",
        description: "Ghi nhận tiền khách hàng đã thanh toán",
        isReady: true
    },
    {
        id: "dailyChanges",
        label: "Phát sinh ngày",
        group: "Tài chính",
        description: "Chốt và theo dõi phát sinh công nợ trong ngày",
        isReady: true
    }
];
