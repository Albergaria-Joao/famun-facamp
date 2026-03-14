
export async function createAsaasCheckoutUrl(quantity: number, price: number, cData: any) {
    const year = new Date().getFullYear()
    console.log("aqui 1")
    console.log(quantity)
    let decimalPrice = price / 100 / quantity; // Verificar se tem alguma questão de ponto flutuante que torne essa divisão insegura
    //console.log(decimalPrice)
    const payload: any = {
        billingTypes:["PIX", "CREDIT_CARD"],
        
        chargeTypes:["DETACHED"],
        
        name: "Teste de integração",
        description: "Checkout criado via Script de Teste",
        
        items: [{"name": `Inscrição Famun ${year}`,"quantity": quantity,"value": decimalPrice}], // Ainda preciso ver como pegar os itens do carrinho

        callback: {
            successUrl: "https://google.com?status=sucesso", // Fazer urls de sucesso e fracasso
            cancelUrl: "https://google.com?status=cancelado",
            autoRedirect: true
        },

        customerData: cData,
        
        minutesToExpire: 60
    };
    if (!process.env.SANDBOX_URL || !process.env.ASAAS_API_KEY) {
    throw new Error("ERRO CRÍTICO: Variáveis de ambiente do Asaas ausentes no servidor.");
}

try {
    const response = await fetch(process.env.SANDBOX_URL, {
        method: 'POST',
        headers: {
            'access_token': process.env.ASAAS_API_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });


    if (!response.ok) {
        const errorData = await response.json();
        console.error("O Asaas rejeitou o payload:", JSON.stringify(errorData, null, 2));
        throw new Error(`Falha na API do Asaas: ${response.status}`);
    }

    const data = await response.json();
    const checkoutUrl = `https://sandbox.asaas.com/checkoutSession/show?id=${data.id}`
    return checkoutUrl;

} catch (error) {
    console.error("Falha crítica ao contatar o Asaas:", error);
    throw error; 
}

}