# Bài 08 - Login xong vào app kiểu model-driven

## 1. Mục tiêu

Sau khi đăng nhập thành công, app không đứng ở `LoginPage` nữa. App sẽ chuyển sang một màn hình chính có bố cục gần giống model-driven app trong Power Platform:

- Bên trái là sitemap/menu module.
- Bên phải là workspace rộng hơn.
- Module đầu tiên là `Sản phẩm`.
- Các module tương lai như `Khách hàng`, `Đơn bán`, `Thanh toán`, `Công nợ` đã có chỗ trong menu nhưng chưa cần làm ngay.

## 2. Luồng chạy tổng quát

Luồng hiện tại là:

```txt
main.tsx
  -> App
    -> AuthProvider
      -> AppContent
        -> nếu user === null: LoginPage
        -> nếu user !== null: ModelDrivenApp
```

Ý nghĩa:

- `AuthProvider` giữ thông tin đăng nhập.
- `AppContent` quyết định đang ở màn hình login hay màn hình chính.
- `LoginPage` chỉ lo đăng nhập.
- `ModelDrivenApp` chỉ lo bố cục sau đăng nhập.

## 3. AuthContext dùng để làm gì?

File `src/context/AuthContext.tsx` tạo ra một nơi dùng chung cho toàn app.

Nó lưu:

- `user`: người đang đăng nhập.
- `setUser`: hàm thay đổi người đang đăng nhập.

Khi login thành công, `LoginPage` gọi:

```ts
setUser(loggedInUser);
```

Khi `user` đổi từ `null` sang object user, React render lại `AppContent`, nên màn hình tự chuyển sang `ModelDrivenApp`.

## 4. Vì sao có localStorage?

`localStorage` giúp app nhớ user sau khi reload trình duyệt.

Khi có user:

```ts
localStorage.setItem("productManagerUser", JSON.stringify(nextUser));
```

Khi đăng xuất:

```ts
localStorage.removeItem("productManagerUser");
```

Đây chưa phải bảo mật hoàn chỉnh như JWT/session thật, nhưng rất phù hợp giai đoạn học frontend + Apps Script.

## 5. appNavigation là sitemap mở rộng

File `src/config/appNavigation.ts` là nơi khai báo menu.

Ví dụ:

```ts
{
    id: "products",
    label: "Sản phẩm",
    group: "Danh mục",
    description: "Quản lý danh sách sản phẩm đang kinh doanh",
    isReady: true
}
```

Sau này muốn thêm `Khách hàng`, bạn sẽ:

1. Viết backend sheet khách hàng.
2. Tạo type `Customer`.
3. Tạo page `CustomersPage`.
4. Đổi `isReady` thành `true`.
5. Trong `ModelDrivenApp`, render `CustomersPage` khi chọn module khách hàng.

## 6. sheetApi gọi backend sản phẩm

File `src/api/sheetApi.ts` là lớp trung gian giữa React và Apps Script.

Trang sản phẩm không gọi `axios` trực tiếp. Nó gọi:

```ts
getRecords<Product>("San_pham", 0);
```

Ý nghĩa:

- `Product` là kiểu dữ liệu TypeScript.
- `"San_pham"` là tên sheet backend đang hiểu.
- `0` là `statecode` đang hoạt động.

Backend của bạn đang có:

```js
case "get":
  return getRecords(sheetName, data.state);
```

Vì vậy frontend chỉ cần gửi đúng `action`, `sheetName`, `state`.

## 7. ProductsPage làm những việc gì?

File `src/pages/ProductsPage.tsx` có 4 nhóm state:

```ts
products
searchText
loadStatus
errorMessage
```

Ý nghĩa:

- `products`: danh sách sản phẩm lấy từ backend.
- `searchText`: chữ người dùng nhập vào ô tìm kiếm.
- `loadStatus`: app đang idle/loading/success/error.
- `errorMessage`: nội dung lỗi nếu gọi API thất bại.

Khi page mở, `useEffect` chạy:

```ts
useEffect(() => {
    void loadProducts();
}, [loadProducts]);
```

Nghĩa là: vừa vào trang sản phẩm thì tự tải danh sách sản phẩm.

## 8. Vì sao dùng useMemo khi lọc sản phẩm?

Danh sách hiển thị được tạo từ:

```ts
const filteredProducts = useMemo(() => {
    return products.filter(...);
}, [products, searchText]);
```

Ý nghĩa:

- Chỉ lọc lại khi `products` hoặc `searchText` thay đổi.
- Code rõ hơn: `products` là dữ liệu gốc, `filteredProducts` là dữ liệu đã lọc để render.

## 9. ModelDrivenApp là layout chính

File `src/components/ModelDrivenApp.tsx` chia màn hình thành:

```tsx
<aside className="site-map-pane">
    menu bên trái
</aside>

<section className="workspace-pane">
    header + nội dung bên phải
</section>
```

Đây là tinh thần model-driven:

- Left pane quyết định đang xem bảng/entity nào.
- Right pane hiển thị list hoặc form của entity đó.

## 10. Cách mở rộng sau này

Khi làm module `Khách hàng`, bạn nên đi theo cùng công thức:

1. Tạo `src/types/customer.ts`.
2. Tạo `src/pages/CustomersPage.tsx`.
3. Trong page đó gọi `getRecords<Customer>("Khach_hang", 0)`.
4. Thêm sheet mapping ở Apps Script.
5. Bật item trong `appNavigation.ts`.
6. Thêm điều kiện render trong `ModelDrivenApp`.

Làm như vậy thì app sẽ lớn lên theo module, không bị biến thành một file `App.tsx` quá dài.
