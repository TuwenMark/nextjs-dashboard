import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Customers',
};

export default async function Page() {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return <p>Customers Page</p>;
}
