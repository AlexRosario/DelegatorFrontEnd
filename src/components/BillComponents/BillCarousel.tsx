import { useEffect, useState } from 'react';
import { useDisplayBills } from '../../providers/BillProvider';
import { BillCard } from './BillCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import { RotatingLines } from 'react-loader-spinner';
export const BillCarousel = () => {
  const {
    billsToDisplay,
    setCurrentIndex,
    currentIndex,
    filteredBills,
    billFilter
  } = useDisplayBills();
  const [color, setColor] = useState('grey');

  useEffect(() => {
    const interval = setInterval(() => {
      const colors = ['red', 'blue', 'green', 'purple', 'orange'];
      setColor(colors[Math.floor(Math.random() * colors.length)]);
    }, 750); // change color every second

    return () => clearInterval(interval);
  }, []);
  const next =
    billsToDisplay.length > 0
      ? currentIndex < filteredBills.length - 1
        ? currentIndex + 1
        : 0
      : 0;

  const prev =
    billsToDisplay.length > 0
      ? currentIndex > 0
        ? currentIndex - 1
        : filteredBills.length - 1
      : 0;
  const isLoading = billsToDisplay.length === 0 ? true : false;

  const updateSlides = () => {
    document.querySelectorAll('.bill-card').forEach((slide, index) => {
      slide.classList.remove('active', 'prev', 'next');
      if (index === currentIndex) slide.classList.add('active');
      if (index === prev) slide.classList.add('prev');
      if (index === next) slide.classList.add('next');
    });
  };

  useEffect(() => {
    updateSlides();
  }, [currentIndex]);

  const goToNum = (number: number) => {
    setCurrentIndex(number);
  };

  const goToNext = () => {
    currentIndex < filteredBills.length - 1
      ? goToNum(currentIndex + 1)
      : goToNum(0);
  };

  const goToPrev = () => {
    currentIndex > 0
      ? goToNum(currentIndex - 1)
      : goToNum(filteredBills.length - 1);
  };

  return (
    <>
      {billFilter === 'Bills with Votes' ? (
        <b>
          These Bills have been alrerady been voted on and will be solely used
          to better predict alignment with your representative/s
        </b>
      ) : (
        <b>
          If a bill has not been voted on, you will later have the option to
          send a letter to your senator or representative letting them know how
          you feel.
        </b>
      )}

      <div className="carousel-container">
        <FontAwesomeIcon
          icon={faAngleLeft}
          onClick={goToPrev}
          className="arrows-carousel"
        />
        <div className="carousel">
          {!isLoading ? (
            filteredBills.map((bill, index) => (
              <BillCard
                bill={bill}
                key={index}
                className={`bill-card ${index === currentIndex ? 'active' : ''} ${index === prev ? 'prev' : ''} ${index === next ? 'next' : ''}`}
                onClick={() => {
                  if (index === prev) goToPrev();
                  if (index === next) goToNext();
                }}
              ></BillCard>
            ))
          ) : (
            <RotatingLines
              strokeColor={color}
              strokeWidth="5"
              animationDuration="0.75"
              width="96"
              visible={true}
            />
          )}
        </div>
        <FontAwesomeIcon
          icon={faAngleRight}
          onClick={goToNext}
          className="arrows-carousel"
        />
      </div>
    </>
  );
};
