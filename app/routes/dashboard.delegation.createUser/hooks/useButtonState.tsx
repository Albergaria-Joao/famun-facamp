import React from "react"

import { FiUserPlus } from "react-icons/fi/index.js"
import Spinner from "~/components/spinner"
import { isSystemOpen } from "~/utils/deadlines"

export function useButtonState(
  allowCreation: boolean | undefined, 
  transition: "idle" | "loading" | "submitting", 
  allow: boolean
) {
  const [buttonLabel, setButtonLabel] = React.useState("Adicionar Participante")
  const [buttonIcon, setButtonIcon] = React.useState(<FiUserPlus className="icon" />)
  const [buttonColor, setButtonColor] = React.useState("gray")

  // 1. Verificamos se o prazo ainda está aberto
  const showCreateButton = isSystemOpen(); 

  React.useEffect(() => {
    // Se o prazo expirou, nem precisamos atualizar os estados internos
    if (!showCreateButton) return;

    setButtonLabel(transition !== 'idle' ? "Adicionando" : "Adicionar Participante")
    setButtonIcon(transition !== 'idle' ? <Spinner dim="18px" color='green' /> : <FiUserPlus className="icon" />)
    setButtonColor(transition !== 'idle' ? "blue" : allowCreation && allow ? "green" : "gray")
  }, [allowCreation, transition, showCreateButton, allow])

  // 2. Retornamos o showCreateButton como o 4º item do array
  return [buttonLabel, buttonIcon, buttonColor, showCreateButton]
}
