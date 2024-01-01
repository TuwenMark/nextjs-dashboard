'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce.number().gt(0, {
    message: 'Please enter an amount greater than $0.',
  }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // const rowFormData = Object.fromEntries(formData.entries());
  // console.log('--------formData-------');
  // console.log(formData);
  // console.log('--------rowFormData-------');
  // console.log(rowFormData);
  // Validate form fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    // console.log(validatedFields);
    // console.log(validatedFields.error);
    // console.log(validatedFields.error.flatten());
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  // Insert data into the database
  try {
    await sql`INSERT INTO invoices(customer_id, amount, status, date) VALUES (${customerId}, ${amountInCents}, ${status}, ${date})`;
  } catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: 'Database Error: Fail to Create Invoice.',
    };
  }
  // Revalidate the cache for the invoices page and redirect the user.
  revalidatePath('/dashboard/invoices');  // 由于数据库的数据有更新，需要让缓存失效
  redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  // const rowFormData = Object.fromEntries(formData.entries());
  // const { customerId, amount, status } = UpdateInvoice.parse(rowFormData);
  // 1. field validation
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  // 2. judge if it's successful
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  // 3. parse the data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  try {
    await sql`UPDATE invoices SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status} WHERE id = ${id}`;
  } catch (error) {
    return {
      message: 'Database Error: Fail to Update Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  // throw new Error('Failed to Delete Invoice');
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (error) {
    return {
      message: 'Database Error: Fail to Delete Invoice.',
    };
  }
  revalidatePath('/dashboard/invoices');
}

/**
 * user login authentication
 * 
 * @param prevState contains the state passed from the useFormState
 * @param formData login data
 * @returns user or error
 */
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    console.log(formData);
    console.log({...formData})
    const user = await signIn('credentials', {
      redirectTo: '/dashboard',
      email: formData.get('email'),
      password: formData.get('password'),
    });
    // signIn执行完就结束了，以下并没有走
    alert(1);
    console.log('user:', user);
    // console.log(111);
    // if (user) {
    //   console.log(2);
    //   redirect('/dashboard');
    // }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}