function CheckoutSteps({ currentStep }) {
  const steps = ["장바구니", "주문/결제", "주문완료"];

  return (
    <ol className="checkout-steps" aria-label="주문 진행 단계">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCurrent = currentStep === stepNumber;

        return (
          <li className={isCurrent ? "is-current" : ""} key={step}>
            <span>{stepNumber}</span>
            <strong>{step}</strong>
          </li>
        );
      })}
    </ol>
  );
}

export default CheckoutSteps;
