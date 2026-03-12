import React from "react";
import { LoaderFunctionArgs, json, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { loadStripe } from "@stripe/stripe-js";

import { getRequiredPayments } from "~/models/payments.server";
import { requireDelegationId, requireUser } from "~/session.server";
import { createPaymentIntent } from "~/stripe.server";
import { usePaymentsData } from "./hooks/usePaymentsData";
import { getCurrentLocale } from "~/hooks/useCurrentLocale";
import { Elements } from "@stripe/react-stripe-js";
import PaymentForm from "./components/paymentForm";
import { checkCuponCode } from "~/models/configuration.server";

import { createAsaasCheckoutUrl } from "~/asaas.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  // get all user names that were selected to be paid
  const namesForPayments = url.searchParams.getAll("s");
  const coupon = url.searchParams.get("coupon");

  const user = await requireUser(request)
  const delegationId = await requireDelegationId(request)
  let payments = await getRequiredPayments({ userId: user.id, isLeader: user.leader, delegationId: delegationId })

  // with the array of available payments, select the Id for the users that are gonna get their payment paid
  payments = payments?.filter(payment => namesForPayments.includes(payment.name) && payment.available && !payment.expired)

  if (payments?.length === 0 || payments === undefined) return redirect("/pay/s")
  const isCouponValid = await checkCuponCode(coupon as string, user.participationMethod)

  // get the total price
  const price = payments.reduce((sum, item) => {
    if (item.available) {
      return isCouponValid ? sum + item.price / 2 : sum + item.price;
    }
    return sum;
  }, 0) as number;

  // STRIPE
  // // create the payment intent
  // let paymentIntent
  // try {
  //   paymentIntent = await createPaymentIntent(
  //     { price, userId: user.id, email: user.email, stripeCustomerId: user.stripeCustomerId as string, payments, currency: payments[0].currency }
  //   )
  // } catch (error) {
  //   console.log(error)
  //   throw json({
  //     errors: { paymentIntent: "Failed to load payment intent" },
  //     status: 400
  //   })
  // }

  // ASAAS
  let checkoutUrl: string;

  try {
    checkoutUrl = await createAsaasCheckoutUrl(price, {
      userId: user.id,
      email: user.email,
      name: user.name,
      cpfCnpj: user.cpf,
      mobilePhone: user.phoneNumber, 
      //address: "aaaaaaa", // Ainda não fui atrás pra ver como pegar o endereço
      address: "Av. Paulista", // Endereço obrigatório
      addressNumber: "150",
      complement: "Sala 1",
      province: "Centro", // Bairro obrigatório
      postalCode: "01310-100", // CEP obrigatório
    });
    console.log(checkoutUrl);
    // name: nomeDoCliente,
    // cpfCnpj: "218.002.330-86", // CPF válido gerado para teste
    // email: "cliente.teste@example.com",
    // mobilePhone: "11999998888", // Celular é obrigatório
    // address: "Av. Paulista", // Endereço obrigatório
    // addressNumber: "150",
    // complement: "Sala 1",
    // province: "Centro", // Bairro obrigatório
    // postalCode: "01310-100" // CEP obrigatório

  } catch (error) {
    console.error("Erro fatal ao gerar Asaas Checkout:", error);
    throw json({
      errors: { asaasCheckout: "Falha ao gerar link de pagamento." },
      status: 400
    });
  }


  // return payment intent and the price
  //return json({ paymentIntent, price, payments, WEBSITE_URL: process.env.WEBSITE_URL, STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY as string })
  return json({ 
    checkoutUrl, 
    price, 
    payments,
    currency: payments[0].currency // Pega o campo de currency direto da estrutura de payments em vez desse intent do Stripe
  });
}

const CompletePayments = () => {
  //const { paymentIntent, price, payments, WEBSITE_URL, STRIPE_PUBLIC_KEY } = useLoaderData<typeof loader>()

  //const [stripePromise, setStripePromise] = React.useState(() => loadStripe(STRIPE_PUBLIC_KEY))
    const { checkoutUrl, price, payments, currency } = useLoaderData<typeof loader>();
  const [delegatesPaymentsCount, advisorPaymentsCount, paymentNames] = usePaymentsData(payments)
  const locale = getCurrentLocale()

  return (
    <div className='auth-container' style={{ gap: "15px" }}>
      <h1 className='auth-title'>
        FAMUN {new Date().getFullYear()}
      </h1>

      <h2 className='join-title'>
        Finalizar pagamento
      </h2>

      <ul className="pay-confirm-payments-list">
        {delegatesPaymentsCount ?
          <li className="pay-confirm-payments-list-item">
            {delegatesPaymentsCount}x inscrições de Delegados
          </li> :
          null
        }

        {advisorPaymentsCount ?
          <li className="pay-confirm-payments-list-item">
            {advisorPaymentsCount}x inscrições de Orientadores
          </li> :
          null
        }
      </ul>

      <div className='pay-price' style={{ margin: 0 }}>
        {(price / 100).toLocaleString(locale, { style: "currency", currency: currency })}
      </div>

      <a 
        href={checkoutUrl} 
        className="pay-submit-button" 
      >
        Ir para o Pagamento Seguro
      </a>
    </div>
  )
}

export default CompletePayments