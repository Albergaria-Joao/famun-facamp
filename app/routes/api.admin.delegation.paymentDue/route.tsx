// postpone payment due
import React from 'react'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { requireAdminId } from '~/session.server';
import { prisma } from '~/db.server';

export const action = async ({ request }: ActionFunctionArgs) => {
  await requireAdminId(request)
  
  // Salvando os inputs nas variaveis 
  const formData = await request.formData()
  const delegationId = formData.get("delegationId")
  const newDate = formData.get("newDate")
  let delegation


  // Validação
  if (typeof delegationId !== "string" || delegationId.trim() === "") {
    return json({ error: "Delegation ID é obrigatório" }, { status: 400 })
  }

  if (typeof newDate !== "string" || newDate.trim() === "") {
    return json({ error: "Nova data (newDate) é obrigatória" }, { status: 400 })
  }

  try {
    delegation = await postponeDelegationPaymentDue(delegationId)
    
  } catch (error) {
    console.log(error)
    return json(
      { errors: { adminAction: "Failed action" } },
      { status: 400 }
    )
  }

  return json({ delegation })
}

async function postponeDelegationPaymentDue(id: string) {
  let currentDate = new Date();
  let dayOfWeek = currentDate.getDay();
  let daysToAdd = (dayOfWeek >= 2 && dayOfWeek <= 5) ? 7 : 5;
  let newDate = new Date(currentDate.setDate(currentDate.getDate() + daysToAdd));

  return prisma.delegation.update({
    where: {
      id
    },
    data: {
      paymentExpirationDate: newDate,
    }
  })
}