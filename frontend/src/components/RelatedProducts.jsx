import React, { useContext, useEffect, useState } from 'react'
import Title from './Title';
import ProductItem from './ProductItem';
import { ShopContext } from '../context/ShopContext'
import { fetchProducts } from '../utils/fetchProducts';

const RelatedProducts = ({category,subCategory}) => {

    const { backendUrl } = useContext(ShopContext);
    const [related,setRelated] = useState([]);

    useEffect(()=>{
        const loadRelated = async () => {
          const products = await fetchProducts(backendUrl, 1, 50);
          let productsCopy = products.slice();

          productsCopy = productsCopy.filter((item) => category === item.category);
          productsCopy = productsCopy.filter((item) => subCategory === item.subCategory);

          setRelated(productsCopy.slice(0,5));
        };

        if (category && subCategory) loadRelated();
        
    },[backendUrl, category, subCategory])

  return (
    <div className='my-24'>
      <div className=' text-center text-3xl py-2'>
        <Title text1={'RELATED'} text2={"PRODUCTS"} />
      </div>

      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6'>
        {related.map((item,index)=>(
            <ProductItem key={index} id={item._id} name={item.name} price={item.price} image={item.image}/>
        ))}
      </div>
    </div>
  )
}

export default RelatedProducts
