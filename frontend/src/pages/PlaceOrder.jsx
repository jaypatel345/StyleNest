import React, { useContext, useEffect, useMemo, useState } from "react";
import Title from "../components/Title";
import CartTotal from "../components/CartTotal";
import { assets } from "../assets/assets";
import { ShopContext } from "../context/ShopContext";
import axios from "axios";
import { toast } from "react-toastify";
import { fetchProductById } from "../utils/fetchProducts";

const PlaceOrder = () => {
  const [method, setMethod] = useState("cod");
  const {
    navigate,
    backendUrl,
    token,
    cartItems,
    setCartItems,
    delivery_fee,
  } = useContext(ShopContext);
  const [productById, setProductById] = useState({});
  const [cartAmount, setCartAmount] = useState(0);

  const cartLines = useMemo(() => {
    const temp = [];
    for (const productId in cartItems) {
      for (const size in cartItems[productId]) {
        const quantity = cartItems[productId][size];
        if (quantity > 0) temp.push({ productId, size, quantity });
      }
    }
    return temp;
  }, [cartItems]);

  useEffect(() => {
    const loadCartProducts = async () => {
      const uniqueIds = Array.from(new Set(cartLines.map((l) => l.productId)));
      if (uniqueIds.length === 0) {
        setProductById({});
        setCartAmount(0);
        return;
      }

      const results = await Promise.all(
        uniqueIds.map(async (id) => {
          const product = await fetchProductById(backendUrl, id);
          return [id, product];
        }),
      );

      const nextMap = Object.fromEntries(results.filter(([, p]) => Boolean(p)));
      setProductById(nextMap);

      let total = 0;
      for (const line of cartLines) {
        const product = nextMap[line.productId];
        if (!product) continue;
        total += product.price * line.quantity;
      }
      setCartAmount(total);
    };

    loadCartProducts();
  }, [backendUrl, cartLines]);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "",
    phone: "",
  });

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setFormData((data) => ({ ...data, [name]: value }));
  };

  // const initPay = (order) => {
  //     const options = {
  //         key: import.meta.env.VITE_RAZORPAY_KEY_ID,
  //         amount: order.amount,
  //         currency: order.currency,
  //         name:'Order Payment',
  //         description:'Order Payment',
  //         order_id: order.id,
  //         receipt: order.receipt,
  //         handler: async (response) => {
  //             console.log(response)
  //             try {
  //                 const { data } = await axios.post(backendUrl + '/api/order/verifyRazorpay',response,{headers:{token}})
  //                 if (data.success) {
  //                     navigate('/orders')
  //                     setCartItems({})
  //                 }
  //             } catch (error) {
  //                 console.log(error)
  //                 toast.error(error)
  //             }
  //         }
  //     }
  //     const rzp = new window.Razorpay(options)
  //     rzp.open()
  // }

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    try {
      let orderItems = [];

      for (const line of cartLines) {
        const product = productById[line.productId];
        if (!product) continue;
        const itemInfo = structuredClone(product);
        itemInfo.size = line.size;
        itemInfo.quantity = line.quantity;
        orderItems.push(itemInfo);
      }

      let orderData = {
        address: formData,
        items: orderItems,
        amount: cartAmount + delivery_fee,
      };

      switch (method) {
        // API Calls for COD
        case "cod": {
          const response = await axios.post(
            backendUrl + "/api/order/place",
            orderData,
            { headers: { token } },
          );
          if (response.data.success) {
            setCartItems({});
            navigate("/orders");
          } else {
            toast.error(response.data.message);
          }
          break;
        }

        case "stripe": {
          const responseStripe = await axios.post(
            backendUrl + "/api/order/stripe",
            orderData,
            { headers: { token } },
          );
          if (responseStripe.data.success) {
            const { session_url } = responseStripe.data;
            window.location.replace(session_url);
          } else {
            toast.error(responseStripe.data.message);
          }
          break;
        }

        // case 'razorpay':
        //     const responseRazorpay = await axios.post(backendUrl + '/api/order/razorpay', orderData, {headers:{token}})
        //     if (responseRazorpay.data.success) {
        //         initPay(responseRazorpay.data.order)
        //     }
        //     break;

        default:
          break;
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  return (
    <form
      onSubmit={onSubmitHandler}
      className="flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh] border-t"
    >
      {/* ------------- Left Side ---------------- */}
      <div className="flex flex-col gap-4 w-full sm:max-w-[480px]">
        <div className="text-xl sm:text-2xl my-3">
          <Title text1={"DELIVERY"} text2={"INFORMATION"} />
        </div>
        <div className="flex gap-3">
          <input
            required
            onChange={onChangeHandler}
            name="firstName"
            value={formData.firstName}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="First name"
          />
          <input
            required
            onChange={onChangeHandler}
            name="lastName"
            value={formData.lastName}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Last name"
          />
        </div>
        <input
          required
          onChange={onChangeHandler}
          name="email"
          value={formData.email}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="email"
          placeholder="Email address"
        />
        <input
          required
          onChange={onChangeHandler}
          name="street"
          value={formData.street}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="text"
          placeholder="Street"
        />
        <div className="flex gap-3">
          <input
            required
            onChange={onChangeHandler}
            name="city"
            value={formData.city}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="City"
          />
          <input
            onChange={onChangeHandler}
            name="state"
            value={formData.state}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="State"
          />
        </div>
        <div className="flex gap-3">
          <input
            required
            onChange={onChangeHandler}
            name="zipcode"
            value={formData.zipcode}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="number"
            placeholder="Zipcode"
          />
          <input
            required
            onChange={onChangeHandler}
            name="country"
            value={formData.country}
            className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
            type="text"
            placeholder="Country"
          />
        </div>
        <input
          required
          onChange={onChangeHandler}
          name="phone"
          value={formData.phone}
          className="border border-gray-300 rounded py-1.5 px-3.5 w-full"
          type="number"
          placeholder="Phone"
        />
      </div>

      {/* ------------- Right Side ------------------ */}
      <div className="mt-8">
        <div className="mt-8 min-w-80">
          <CartTotal amount={cartAmount} />
        </div>

        <div className="mt-12">
          <Title text1={"PAYMENT"} text2={"METHOD"} />
          {/* --------------- Payment Method Selection ------------- */}
          <div className="flex gap-3 flex-col lg:flex-row">
            <div
              onClick={() => setMethod("stripe")}
              className="flex items-center gap-3 border p-2 px-3 cursor-pointer"
            >
              <p
                className={`min-w-3.5 h-3.5 border rounded-full ${
                  method === "stripe" ? "bg-green-400" : ""
                }`}
              ></p>
              <img className="h-5 mx-4" src={assets.stripe_logo} alt="" />
            </div>
            {/* <div onClick={() => setMethod('razorpay')} className='flex items-center gap-3 border p-2 px-3 cursor-pointer'>
                            <p className={`min-w-3.5 h-3.5 border rounded-full ${method === 'razorpay' ? 'bg-green-400' : ''}`}></p>
                            <img className='h-5 mx-4' src={assets.razorpay_logo} alt="" />
                        </div> */}
            <div
              onClick={() => setMethod("cod")}
              className="flex items-center gap-3 border p-2 px-3 cursor-pointer"
            >
              <p
                className={`min-w-3.5 h-3.5 border rounded-full ${
                  method === "cod" ? "bg-green-400" : ""
                }`}
              ></p>
              <p className="text-gray-500 text-sm font-medium mx-4">
                CASH ON DELIVERY
              </p>
            </div>
          </div>

          <div className="w-full text-end mt-8">
            <button
              type="submit"
              className="bg-black text-white px-16 py-3 text-sm"
            >
              PLACE ORDER
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default PlaceOrder;
