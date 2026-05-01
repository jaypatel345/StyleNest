import React, { useContext, useEffect, useState } from 'react'
import Hero from '../components/Hero'
import LatestCollection from '../components/LatestCollection'
import BestSeller from '../components/BestSeller'
import OurPolicy from '../components/OurPolicy'
import NewsletterBox from '../components/NewsletterBox'
import { ShopContext } from '../context/ShopContext'
import { fetchProducts } from '../utils/fetchProducts'

const Home = () => {
  const { backendUrl } = useContext(ShopContext);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      const data = await fetchProducts(backendUrl, 1, 30);
      setProducts(data);
    };
    loadProducts();
  }, [backendUrl]);

  return (
    <div>
      <Hero />
      <LatestCollection products={products} />
      <BestSeller products={products} />
      <OurPolicy/>
      <NewsletterBox/>
    </div>
  )
}

export default Home
