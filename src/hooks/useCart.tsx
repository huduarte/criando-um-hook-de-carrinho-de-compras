import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId)
      
      if(!product){
        const { data: product } = await api.get<Product>(`/products/${productId}`);
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        if(stock.amount < 1){
          toast.error('Quantidade solicitada fora de estoque');
          return;
        } else {
          const productRequested = {
            ...product,
            amount: 1,
          }

          setCart([...cart, productRequested])
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, productRequested]))
        }
      } else {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        if (product.amount < stock.amount) {
          const newCart = cart.map(product =>
            product.id === productId
              ? { ...product, amount: product.amount + 1 }
              : product
          );

          setCart([...newCart])
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]))
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.find(product => product.id === productId);

      if (!findProduct) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const removeProduct = cart.filter(product => product.id !== productId)

      setCart(removeProduct)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(removeProduct))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;
      const product = cart.find(product => product.id === productId)

      if(!product) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (amount < stock.amount) {
        const newCart = cart.map(product =>
          product.id === productId
            ? { ...product, amount }
            : product
        );

        setCart([...newCart])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...newCart]))
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
      
    } catch {
      toast.error('Quantidade solicitada fora de estoque');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
