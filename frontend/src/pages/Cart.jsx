import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from '../components/Title';
import { assets } from '../assets/assets';
import CartTotal from '../components/CartTotal';
import { fetchProductById } from '../utils/fetchProducts';

const Cart = () => {

  const { backendUrl, currency, cartItems, updateQuantity, navigate } = useContext(ShopContext);

  const [cartData, setCartData] = useState([]);
  const [productById, setProductById] = useState({});
  const [cartAmount, setCartAmount] = useState(0);

  useEffect(() => {
    const tempData = [];
    for (const items in cartItems) {
      for (const item in cartItems[items]) {
        if (cartItems[items][item] > 0) {
          tempData.push({
            _id: items,
            size: item,
            quantity: cartItems[items][item]
          })
        }
      }
    }
    setCartData(tempData);
  }, [cartItems])

  useEffect(() => {
    const loadProducts = async () => {
      const uniqueIds = Array.from(new Set(cartData.map((i) => i._id)));
      if (uniqueIds.length === 0) {
        setProductById({});
        setCartAmount(0);
        return;
      }

      const results = await Promise.all(
        uniqueIds.map(async (id) => {
          const product = await fetchProductById(backendUrl, id);
          return [id, product];
        })
      );

      const nextMap = Object.fromEntries(results.filter(([, p]) => Boolean(p)));
      setProductById(nextMap);

      let total = 0;
      for (const lineItem of cartData) {
        const product = nextMap[lineItem._id];
        if (!product) continue;
        total += product.price * lineItem.quantity;
      }
      setCartAmount(total);
    };

    loadProducts();
  }, [backendUrl, cartData]);

  return (
    <div className='border-t pt-14'>

      <div className=' text-2xl mb-3'>
        <Title text1={'YOUR'} text2={'CART'} />
      </div>

      <div>
        {
          cartData.map((item, index) => {

            const productData = productById[item._id];
            if (!productData) return null;

	            return (
	              <div key={index} className='py-4 border-t border-b text-gray-700 grid grid-cols-[4fr_0.5fr_0.5fr] sm:grid-cols-[4fr_2fr_0.5fr] items-center gap-4'>
	                <div className=' flex items-start gap-6'>
	                  {productData?.image?.[0] ? (
	                    <img className='w-16 sm:w-20' src={productData.image[0]} alt="" />
	                  ) : (
	                    <div className='w-16 sm:w-20 bg-gray-100 border' />
	                  )}
	                  <div>
	                    <p className='text-xs sm:text-lg font-medium'>{productData.name}</p>
	                    <div className='flex items-center gap-5 mt-2'>
	                      <p>{currency}{productData.price}</p>
                      <p className='px-2 sm:px-3 sm:py-1 border bg-slate-50'>{item.size}</p>
                    </div>
                  </div>
                </div>
                <input onChange={(e) => e.target.value === '' || e.target.value === '0' ? null : updateQuantity(item._id, item.size, Number(e.target.value))} className='border max-w-10 sm:max-w-20 px-1 sm:px-2 py-1' type="number" min={1} defaultValue={item.quantity} />
                <img onClick={() => updateQuantity(item._id, item.size, 0)} className='w-4 mr-4 sm:w-5 cursor-pointer' src={assets.bin_icon} alt="" />
              </div>
            )

          })
        }
      </div>

      <div className='flex justify-end my-20'>
        <div className='w-full sm:w-[450px]'>
          <CartTotal amount={cartAmount} />
          <div className=' w-full text-end'>
            <button onClick={() => navigate('/place-order')} className='bg-black text-white text-sm my-8 px-8 py-3'>PROCEED TO CHECKOUT</button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Cart
