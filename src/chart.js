class HistoricalPriceChart {
  constructor() {
    this.margin;
    this.width;
    this.height;
    this.xScale;
    this.yscale;
    this.currentData = {};

    this.loadData('vig').then(data => {
      console.log(data);
      this.currentData = data;
      this.initialiseChart();
    });

    const selectElement = document.getElementById('select-stock');
    selectElement.addEventListener('change', event => {
      this.setDataset(event);
    });
  }

  loadData(selectedDataset = 'vig') {
    let loadFile = '';
    if (selectedDataset === 'vig') {
      loadFile = 'sample-data-vig.json';
    } else if (selectedDataset === 'vti') {
      loadFile = 'sample-data-vti.json';
    } else if (selectedDataset === 'vea') {
      loadFile = 'sample-data-vea.json';
    }

    return d3.json(loadFile).then(data => {
      const chartResultsData = data['chart']['result'][0];
      const quoteData = chartResultsData['indicators']['quote'][0];
      /*
      console.log(
        Object.values(chartResultsData['events']['dividends']).map(res => {
          return {
            date: new Date(res['date'] * 1000),
            yield: res['amount']
          };
        })
      );
      return chartResultsData['timestamp'].map((time, index) => ({
        date: new Date(time * 1000),
        high: quoteData['high'][index],
        low: quoteData['low'][index],
        open: quoteData['open'][index],
        close: quoteData['close'][index],
        volume: quoteData['volume'][index]
      }));
      */
      return {
        dividends: Object.values(chartResultsData['events']['dividends']).map(
          res => {
            return {
              date: new Date(res['date'] * 1000),
              yield: res['amount']
            };
          }
        ),
        quote: chartResultsData['timestamp'].map((time, index) => ({
          date: new Date(time * 1000),
          high: quoteData['high'][index],
          low: quoteData['low'][index],
          open: quoteData['open'][index],
          close: quoteData['close'][index],
          volume: quoteData['volume'][index]
        }))
      };
    });
  }

  movingAverage(data, numberOfPricePoints) {
    return data.map((row, index, total) => {
      const start = Math.max(0, index - numberOfPricePoints);
      //const end = index + numberOfPricePoints;
      const end = index;
      const subset = total.slice(start, end + 1);
      const sum = subset.reduce((a, b) => {
        return a + b['close'];
      }, 0);

      return {
        date: row['date'],
        average: sum / subset.length
      };
    });
  }

  // credits: https://brendansudol.com/writing/responsive-d3
  responsivefy(svg) {
    // get container + svg aspect ratio
    const container = d3.select(svg.node().parentNode),
      width = parseInt(svg.style('width')),
      height = parseInt(svg.style('height')),
      aspect = width / height;

    // get width of container and resize svg to fit it
    const resize = () => {
      var targetWidth = parseInt(container.style('width'));
      svg.attr('width', targetWidth);
      svg.attr('height', Math.round(targetWidth / aspect));
    };

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    svg
      .attr('viewBox', '0 0 ' + width + ' ' + height)
      .attr('perserveAspectRatio', 'xMinYMid')
      .call(resize);

    // to register multiple listeners for same event type,
    // you need to add namespace, i.e., 'click.foo'
    // necessary if you call invoke this function for multiple svgs
    // api docs: https://github.com/mbostock/d3/wiki/Selections#on
    d3.select(window).on('resize.' + container.attr('id'), resize);
  }

  initialiseChart() {
    let data = this.currentData['quote'].filter(
      row => row['high'] && row['low'] && row['close'] && row['open']
    );

    const thisYearStartDate = new Date(2018, 0, 1);
    const thisYearEndDate = new Date(2018, 11, 31);

    // filter out data based on time period
    data = data.filter(row => {
      if (row['date']) {
        return (
          row['date'] >= thisYearStartDate && row['date'] <= thisYearEndDate
        );
      }
    });

    this.margin = { top: 50, right: 50, bottom: 50, left: 50 };
    this.width = window.innerWidth - this.margin.left - this.margin.right; // Use the window's width
    this.height = window.innerHeight - this.margin.top - this.margin.bottom; // Use the window's height

    // find data range
    const xMin = d3.min(data, d => {
      return d['date'];
    });

    const xMax = d3.max(data, d => {
      return d['date'];
    });

    const yMin = d3.min(data, d => {
      return d['close'];
    });

    const yMax = d3.max(data, d => {
      return d['close'];
    });

    // scale using range
    this.xScale = d3
      .scaleTime()
      .domain([xMin, xMax])
      .range([0, this.width]);

    this.yScale = d3
      .scaleLinear()
      .domain([yMin - 5, yMax])
      .range([this.height, 0]);

    // add chart SVG to the page
    const svg = d3
      .select('#chart')
      .append('svg')
      .attr('width', this.width + this.margin['left'] + this.margin['right'])
      .attr('height', this.height + this.margin['top'] + this.margin['bottom'])
      .call(this.responsivefy)
      .append('g')
      .attr(
        'transform',
        `translate(${this.margin['left']}, ${this.margin['top']})`
      );

    // create the axes component
    svg
      .append('g')
      .attr('id', 'xAxis')
      .attr('transform', `translate(0, ${this.height})`)
      .call(d3.axisBottom(this.xScale));

    svg
      .append('g')
      .attr('id', 'yAxis')
      .attr('transform', `translate(${this.width}, 0)`)
      .call(d3.axisRight(this.yScale));

    // renders close price line chart and moving average line chart

    // generates lines when called
    const line = d3
      .line()
      .x(d => {
        return this.xScale(d['date']);
      })
      .y(d => {
        return this.yScale(d['close']);
      });

    const movingAverageLine = d3
      .line()
      .x(d => {
        return this.xScale(d['date']);
      })
      .y(d => {
        return this.yScale(d['average']);
      })
      .curve(d3.curveBasis);

    svg
      .append('path')
      .data([data]) // binds data to the line
      .style('fill', 'none')
      .attr('id', 'priceChart')
      .attr('stroke', 'steelblue')
      .attr('d', line);

    // calculates simple moving average over 50 days
    const movingAverageData = this.movingAverage(data, 49);
    svg
      .append('path')
      .data([movingAverageData])
      .style('fill', 'none')
      .attr('id', 'movingAverageLine')
      .attr('stroke', '#FF8900')
      .attr('d', movingAverageLine);

    // renders x and y crosshair
    const focus = svg
      .append('g')
      .attr('class', 'focus')
      .style('display', 'none');

    focus.append('circle').attr('r', 4.5);
    focus.append('line').classed('x', true);
    focus.append('line').classed('y', true);

    svg
      .append('rect')
      .attr('class', 'overlay')
      .attr('width', this.width)
      .attr('height', this.height)
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', () => focus.style('display', 'none'))
      .on('mousemove', generateCrosshair);

    d3.select('.overlay').style('fill', 'none');
    d3.select('.overlay').style('pointer-events', 'all');

    d3.selectAll('.focus line').style('fill', 'none');
    d3.selectAll('.focus line').style('stroke', '#67809f');
    d3.selectAll('.focus line').style('stroke-width', '1.5px');
    d3.selectAll('.focus line').style('stroke-dasharray', '3 3');

    //returs insertion point
    const bisectDate = d3.bisector(d => d.date).left;

    const that = this;
    /* mouseover function to generate crosshair */
    function generateCrosshair() {
      //returns corresponding value from the domain
      const correspondingDate = that.xScale.invert(d3.mouse(this)[0]);
      //gets insertion point
      const i = bisectDate(data, correspondingDate, 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const currentPoint =
        correspondingDate - d0['date'] > d1['date'] - correspondingDate
          ? d1
          : d0;
      focus.attr(
        'transform',
        `translate(${that.xScale(currentPoint['date'])}, ${that.yScale(
          currentPoint['close']
        )})`
      );

      focus
        .select('line.x')
        .attr('x1', 0)
        .attr('x2', that.width - that.xScale(currentPoint['date']))
        .attr('y1', 0)
        .attr('y2', 0);

      focus
        .select('line.y')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', that.height - that.yScale(currentPoint['close']));

      // updates the legend to display the date, open, close, high, low, and volume of the selected mouseover area
      that.updateLegends(currentPoint);
    }

    /* Volume series bars */
    const yMinVolume = d3.min(data, d => {
      return Math.min(d['volume']);
    });

    const yMaxVolume = d3.max(data, d => {
      return Math.max(d['volume']);
    });

    const yVolumeScale = d3
      .scaleLinear()
      .domain([yMinVolume, yMaxVolume])
      .range([this.height, this.height * (3 / 4)]);

    svg
      .selectAll()
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => {
        return this.xScale(d['date']);
      })
      .attr('y', d => {
        return yVolumeScale(d['volume']);
        //return height - yVolumeScale(d['volume']);
      })
      .attr('class', 'vol')
      .attr('fill', (d, i) => {
        if (i === 0) {
          return '#03a678';
        } else {
          return data[i - 1].close > d.close ? '#c0392b' : '#03a678'; // green bar if price is rising during that period, and red when price  is falling
        }
      })
      .attr('width', 1)
      .attr('height', d => {
        return this.height - yVolumeScale(d['volume']);
        //return height - yVolumeScale(d['volume']);
      });
    // testing axis for volume
    /*
    svg.append('g').call(d3.axisLeft(yVolumeScale));
    */

    /* scatter plot depicting dividend yield */
    /*
    svg
      .selectAll('dividend')
      .data(data)
      .enter()
      .append('path')
      .attr('class', 'dividend')
      .attr('d', d3.symbol().type('d3.symbolSquare'))
      .attr(
        'transform',
        d =>
          'translate(' +
          this.xScale(d['date']) +
          ',' +
          this.yScale(d['close']) +
          ')'
      );
      */
    //const thisYearStartDate = new Date(2018, 0, 1);
    //const thisYearEndDate = new Date(2018, 11, 31);

    // filter out data based on time period
    const dividendData = this.currentData['dividends'].filter(row => {
      if (row['date']) {
        return (
          row['date'] >= thisYearStartDate && row['date'] <= thisYearEndDate
        );
      }
    });
    console.log(dividendData);
    console.log(d3.symbols);
    const dividendSymbol = svg
      .selectAll('dividend')
      .data(dividendData)
      .enter()
      .append('g');
    dividendSymbol
      .append('path')
      .attr('class', 'dividend')
      .attr(
        'd',
        d3
          .symbol()
          .size(300)
          .type(d3.symbolSquare)
      )
      .attr('transform', (d, i) => {
        return `translate(${this.xScale(d['date'])},${this.height - 50})`;
      });
    //.style('fill', '#2e3131');
    dividendSymbol
      .append('text')
      .attr('x', -5)
      .attr('y', 5)
      .text(function(d) {
        return 'D';
      })
      .attr('transform', (d, i) => {
        return `translate(${this.xScale(d['date'])},${this.height - 50})`;
      })
      .style('fill', 'white');
    /*
    svg
      .selectAll('dividend-text')
      .data(dividendData)
      .enter()
      .append('text')
      .style('color', 'white')
      .text(function(d) {
        return 'D';
      })
      .attr('transform', (d, i) => {
        return `translate(${this.xScale(d['date'])},${this.height - 50})`;
      });
      */
  }

  setDataset(event) {
    this.loadData(event.target.value).then(response => {
      const thisYearStartDate = new Date(2018, 0, 1);
      const thisYearEndDate = new Date(2018, 11, 31);
      const res = response['quote']
        .filter(row => row['high'] && row['low'] && row['close'] && row['open'])
        .filter(row => {
          if (row['date']) {
            return (
              row['date'] >= thisYearStartDate && row['date'] <= thisYearEndDate
            );
          }
        });
      //this.currentData = res;
      this.margin = { top: 50, right: 50, bottom: 50, left: 50 };
      this.width = window.innerWidth - this.margin.left - this.margin.right; // Use the window's width
      this.height = window.innerHeight - this.margin.top - this.margin.bottom; // Use the window's height

      const xMin = d3.min(res, d => {
        return Math.min(d['date']);
      });

      const xMax = d3.max(res, d => {
        return Math.max(d['date']);
      });

      const yMin = d3.min(res, d => {
        return Math.min(d['close']);
      });

      const yMax = d3.max(res, d => {
        return Math.max(d['close']);
      });

      this.xScale = d3
        .scaleTime()
        .domain([xMin, xMax])
        .range([0, this.width]);

      this.yScale = d3
        .scaleLinear()
        .domain([yMin - 5, yMax])
        .range([this.height, 0]);

      const line = d3
        .line()
        .x(d => {
          return this.xScale(d['date']);
        })
        .y(d => {
          return this.yScale(d['close']);
        });

      const movingAverageLine = d3
        .line()
        .x(d => {
          return this.xScale(d['date']);
        })
        .y(d => {
          return this.yScale(d['average']);
        })
        .curve(d3.curveBasis);

      const svg = d3.select('#chart').transition();
      svg
        .select('#priceChart')
        .duration(750)
        .attr('d', line(res));

      const movingAverageData = this.movingAverage(res, 49);
      svg
        .select('#movingAverageLine')
        .duration(750)
        .attr('d', movingAverageLine(movingAverageData));

      d3.selectAll('#xAxis').call(d3.axisBottom(this.xScale));
      d3.selectAll('#yAxis').call(d3.axisRight(this.yScale));

      const chart = d3.select('#chart').select('g');

      const yMinVolume = d3.min(res, d => {
        return Math.min(d['volume']);
      });

      const yMaxVolume = d3.max(res, d => {
        return Math.max(d['volume']);
      });

      const yVolumeScale = d3
        .scaleLinear()
        .domain([yMinVolume, yMaxVolume])
        .range([this.height, this.height * (3 / 4)]);

      //select, followed by updating data join
      const bars = chart.selectAll('.vol').data(res, d => d['date']);

      bars.exit().remove();

      bars
        .enter()
        .append('rect')
        .attr('class', 'vol')
        .merge(bars)
        .transition()
        .duration(750)
        .attr('x', d => {
          return this.xScale(d['date']);
        })
        .attr('y', d => {
          return yVolumeScale(d['volume']);
        })
        .attr('fill', (d, i) => {
          if (i === 0) {
            return '#03a678';
          } else {
            return res[i - 1].close > d.close ? '#c0392b' : '#03a678'; // green bar if price is rising during that period, and red when price  is falling
          }
        })
        .attr('width', 1)
        .attr('height', d => {
          return this.height - yVolumeScale(d['volume']);
        });

      //select
      const overlay = chart.selectAll('.overlay').data(res);

      //remove old crosshair
      overlay.exit().remove();

      //add crosshair
      overlay.enter();

      //update crosshair
      overlay
        .attr('class', 'overlay')
        .attr('width', this.width)
        .attr('height', this.height)
        .on('mouseover', () => focus.style('display', null))
        .on('mouseout', () => focus.style('display', 'none'))
        .on('mousemove', generateCrosshair);

      const focus = d3.select('.focus');
      const bisectDate = d3.bisector(d => d.date).left;

      const that = this;
      /* mouseover function to generate crosshair */
      function generateCrosshair() {
        //returns corresponding value from the domain
        const correspondingDate = that.xScale.invert(d3.mouse(this)[0]);
        //gets insertion point
        const i = bisectDate(res, correspondingDate, 1);
        const d0 = res[i - 1];
        const d1 = res[i];
        const currentPoint =
          correspondingDate - d0['date'] > d1['date'] - correspondingDate
            ? d1
            : d0;
        focus.attr(
          'transform',
          `translate(${that.xScale(currentPoint['date'])}, ${that.yScale(
            currentPoint['close']
          )})`
        );

        focus
          .select('line.x')
          .attr('x1', 0)
          .attr('x2', that.width - that.xScale(currentPoint['date']))
          .attr('y1', 0)
          .attr('y2', 0);

        focus
          .select('line.y')
          .attr('x1', 0)
          .attr('x2', 0)
          .attr('y1', 0)
          .attr('y2', that.height - that.yScale(currentPoint['close']));

        // updates the legend to display the date, open, close, high, low, and volume and selected mouseover area
        that.updateLegends(currentPoint);
      }
    });
  }

  updateLegends(currentPoint) {
    d3.selectAll('.lineLegend').remove();

    const legendKeys = Object.keys(currentPoint);
    const lineLegend = d3
      .select('#chart')
      .select('g')
      .selectAll('.lineLegend')
      .data(legendKeys)
      .enter()
      .append('g')
      .attr('class', 'lineLegend')
      .attr('transform', (d, i) => {
        return `translate(0, ${i * 20})`;
      });
    lineLegend
      .append('text')
      .text(d => {
        if (d === 'date') {
          return `${d}: ${currentPoint[d].toLocaleDateString()}`;
        } else if (
          d === 'high' ||
          d === 'low' ||
          d === 'open' ||
          d === 'close'
        ) {
          return `${d}: ${currentPoint[d].toFixed(2)}`;
        } else {
          return `${d}: ${currentPoint[d]}`;
        }
      })
      .style('fill', 'white')
      .attr('transform', 'translate(15,9)'); //align texts with boxes
  }
}
