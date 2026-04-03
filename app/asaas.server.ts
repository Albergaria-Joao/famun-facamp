import { prisma } from "~/db.server";


export async function getOrCreateAsaasCustomerId(userId: string, delegationId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
        throw new Error("Usuário não encontrado para criar checkout do Asaas.");
    }
    
    if (user.asaasCustomerId) {
        return user.asaasCustomerId;
    }

    if (!user.cpf) {
        throw new Error("CPF é obrigatório para gerar pagamentos via Asaas.");
    }

    const endereco = await prisma.address.findUnique({
        where: {
        delegationId: delegationId
        },
        select: {
        address: true,
        postalCode: true
        }
    })

    if (!endereco) {
        throw new Error("Endereço da delegação não encontrado. Impossível rotear pagamento.");
    }

    // Pega número
    let enderecoNum = parseInt(endereco.address.match(/\d+/)?.[0] || "0"); // encontra a primeira sequência numérica no endereço e pega como número 
    if (isNaN(enderecoNum) || endereco.address.toLowerCase().includes("s/n") || endereco.address.toLowerCase().includes("sn") ) { // Se for end. s/ número
        enderecoNum = 0; // ou algum valor padrão
    }

    const asaasPayload = {
      externalReference: user.id, // Serve pra gent pegar 
      email: user.email,
      name: user.name,
      cpfCnpj: user.cpf,
      mobilePhone: user.phoneNumber, 
      address: endereco.address, // Endereço obrigatório
      addressNumber: enderecoNum,
      //complement: "Sala 1",
      province: "-", // Bairro obrigatório
      postalCode: endereco.postalCode // CEP obrigatório
    }

    const response = await fetch(process.env.SANDBOX_URL + "/customers", {
        method: "POST",
        headers: {
            "access_token": process.env.ASAAS_API_KEY as string,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(asaasPayload)
    });

    // gemini me ajudou aqui, tava dando erro
    // 1. LÊ COMO TEXTO BRUTO PRIMEIRO. NUNCA CONFIE NA API.
    const responseText = await response.text();

    if (!response.ok) {
        console.error("ERRO BRUTO CRIAR CLIENTE:", responseText);
        throw new Error(`Falha no Asaas (Status ${response.status}): ${responseText}`);
    }

    const customerData = responseText ? JSON.parse(responseText) : {};
    
    await prisma.user.update({
        where: { id: user.id },
        data: { asaasCustomerId: customerData.id } // id de cliente do Asaas, com todas as infos guardadas nele
    });
    return customerData.id; // Id do cliente no Asaas

}



export async function createAsaasCheckoutUrl(quantity: number, price: number, userId: string, delegationId: string) {
    const year = new Date().getFullYear()
    
    const customerId = await getOrCreateAsaasCustomerId(userId, delegationId) // Garante que o usuário tenha um asaasCustomerId antes de criar o checkout
    //let customerId = user?.asaasCustomerId;

    console.log("aqui 1")
    console.log(quantity)
    let decimalPrice = price / 100 / quantity; // Verificar se tem alguma questão de ponto flutuante que torne essa divisão insegura
    //console.log(decimalPrice)
    const payload: any = {
        billingTypes:["CREDIT_CARD"],
        
        chargeTypes:["DETACHED"],
        
        name: "Inscrição FAMUN 2026",
        description: "Checkout de Inscrição FAMUN 2026",
        
        items: [{"name": `Inscrição Famun ${year}`,"quantity": quantity,"value": decimalPrice}], // Ainda preciso ver como pegar os itens do carrinho

        callback: {
            successUrl: "https://google.com?status=sucesso", // Fazer urls de sucesso e fracasso
            cancelUrl: "https://google.com?status=cancelado",
            //cancelUrl: `${process.env.WEBSITE_URL}/pay/s`,
            autoRedirect: true
        },
        customer: customerId, // Id do cliente no Asaas, que tem as infos do usuário guardadas nele
        //customerData: cData,
        //dueDate: "2026-04-10",
        //externalReference: userId,
        minutesToExpire: 60
    };
    if (!process.env.SANDBOX_URL || !process.env.ASAAS_API_KEY) {
    throw new Error("ERRO CRÍTICO: Variáveis de ambiente do Asaas ausentes no servidor.");
}

try {
    const asaasPaymentUrl = process.env.SANDBOX_URL + "/checkouts";
    const response = await fetch(asaasPaymentUrl, {
        method: 'POST',
        headers: {
            'access_token': process.env.ASAAS_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    if (!response.ok) {
        console.error("O Asaas rejeitou o payload do Checkout:", responseText);
        throw new Error(`Falha na API do Asaas: ${response.status} - ${responseText}`);
    }

    // 4. FAZ O PARSE DO SUCESSO
    const data = responseText ? JSON.parse(responseText) : {};
    
    const checkoutUrl = `https://sandbox.asaas.com/checkoutSession/show?id=${data.id}`;
    return checkoutUrl

} catch (error) {
    console.error("Falha crítica ao contatar o Asaas:", error);
    throw error; 
}

}