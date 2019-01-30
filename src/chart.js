class HistoricalPriceChart {
  constructor() {
    this.margin;
    this.width;
    this.height;
    this.xScale;
    this.yscale;
    this.currentData = {};

    this.loadData('vig').then(data => {
      this.initialiseChart(data);
    });

    const selectElement = document.getElementById('select-stock');
    selectElement.addEventListener('change', event => {
      this.setDataset(event);
    });

    const viewClose = document.querySelector('input[id=close]');
    viewClose.addEventListener('change', event => {
      this.toggleClose(document.querySelector('input[id=close]').checked);
    });

    const viewMovingAverage = document.querySelector(
      'input[id=moving-average]'
    );
    viewMovingAverage.addEventListener('change', event => {
      this.toggleMovingAverage(
        document.querySelector('input[id=moving-average]').checked
      );
    });

    const viewOHLC = document.querySelector('input[id=ohlc]');
    viewOHLC.addEventListener('change', event => {
      this.toggleOHLC(document.querySelector('input[id=ohlc]').checked);
    });

    const viewCandlesticks = document.querySelector('input[id=candlesticks]');
    viewCandlesticks.addEventListener('change', event => {
      this.toggleCandlesticks(
        document.querySelector('input[id=candlesticks]').checked
      );
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
      var targetHeight = parseInt(container.style('height'));
      var targetAspect = targetWidth / targetHeight;
      /*
      if (this) {
        this.width = targetWidth;
        this.height = Math.round(targetWidth / targetAspect);
      }
      */
      svg.attr('width', targetWidth);
      svg.attr('height', Math.round(targetWidth / targetAspect));
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

  initialiseChart(data) {
    const thisYearStartDate = new Date(2018, 0, 1);
    const thisYearEndDate = new Date(2018, 11, 31);
    // filter out data based on time period
    this.currentData = data['quote']
      .filter(row => row['high'] && row['low'] && row['close'] && row['open'])
      .filter(row => {
        if (row['date']) {
          return (
            row['date'] >= thisYearStartDate && row['date'] <= thisYearEndDate
          );
        }
      });

    this.margin = { top: 50, right: 40, bottom: 50, left: 60 };
    this.width = window.innerWidth - this.margin.left - this.margin.right; // Use the window's width
    this.height = window.innerHeight - this.margin.top - this.margin.bottom; // Use the window's height

    // find data range
    const xMin = d3.min(this.currentData, d => d['date']);
    const xMax = d3.max(this.currentData, d => d['date']);
    const yMin = d3.min(this.currentData, d => d['close']);
    const yMax = d3.max(this.currentData, d => d['close']);

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
      //.call(this.responsivefy)
      .append('g')
      .attr(
        'transform',
        `translate(${this.margin['left']}, ${this.margin['top']})`
      );

    // create the axes component
    this.xAxis = svg
      .append('g')
      .attr('class', 'xAxis')
      .attr('transform', `translate(0, ${this.height})`)
      .call(d3.axisBottom(this.xScale));

    this.yAxis = svg
      .append('g')
      .attr('class', 'yAxis')
      .attr('transform', `translate(${this.width}, 0)`)
      .call(d3.axisRight(this.yScale));
    svg
      .append('g')
      .attr('id', 'leftAxis')
      .attr('transform', `translate(0, 0)`);

    // define x and y crosshair properties
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
      .attr('height', this.height);

    d3.select('.overlay').style('fill', 'none');
    d3.select('.overlay').style('pointer-events', 'all');

    d3.selectAll('.focus line').style('fill', 'none');
    d3.selectAll('.focus line').style('stroke', '#67809f');
    d3.selectAll('.focus line').style('stroke-width', '1.5px');
    d3.selectAll('.focus line').style('stroke-dasharray', '3 3');

    // get VIG dividend data for year of 2018
    const dividendData = data['dividends'].filter(row => {
      if (row['date']) {
        return (
          row['date'] >= thisYearStartDate && row['date'] <= thisYearEndDate
        );
      }
    });

    // generates the rest of the graph
    this.updateChart(dividendData);
  }

  setDataset(event) {
    this.loadData(event.target.value).then(response => {
      const thisYearStartDate = new Date(2018, 0, 1);
      const thisYearEndDate = new Date(2018, 11, 31);
      this.currentData = response['quote']
        .filter(row => row['high'] && row['low'] && row['close'] && row['open'])
        .filter(row => {
          if (row['date']) {
            return (
              row['date'] >= thisYearStartDate && row['date'] <= thisYearEndDate
            );
          }
        });

      this.margin = { top: 50, right: 40, bottom: 50, left: 60 };
      this.width = window.innerWidth - this.margin.left - this.margin.right; // Use the window's width
      this.height = window.innerHeight - this.margin.top - this.margin.bottom; // Use the window's height

      /* update the min, max values, and scales for the axes */
      const xMin = d3.min(this.currentData, d => Math.min(d['date']));
      const xMax = d3.max(this.currentData, d => Math.max(d['date']));
      const yMin = d3.min(this.currentData, d => Math.min(d['close']));
      const yMax = d3.max(this.currentData, d => Math.max(d['close']));

      this.xScale.domain([xMin, xMax]);
      this.yScale.domain([yMin - 5, yMax]);

      // get dividend data for current dataset
      const dividendData = response['dividends'].filter(row => {
        if (row['date']) {
          return (
            row['date'] >= thisYearStartDate && row['date'] <= thisYearEndDate
          );
        }
      });

      this.updateChart(dividendData);
    });
  }

  updateChart(dividendData) {
    /* Update the axis */
    d3.select('.xAxis').call(d3.axisBottom(this.xScale));
    d3.select('.yAxis').call(d3.axisRight(this.yScale));

    /* Update the volume series */
    const chart = d3.select('#chart').select('g');
    const yMinVolume = d3.min(this.currentData, d => Math.min(d['volume']));
    const yMaxVolume = d3.max(this.currentData, d => Math.max(d['volume']));

    const yVolumeScale = d3
      .scaleLinear()
      .domain([yMinVolume, yMaxVolume])
      .range([this.height, this.height * (3 / 4)]);
    d3.select('#leftAxis').call(d3.axisLeft(yVolumeScale));

    //select, followed by updating data join
    const bars = chart.selectAll('.vol').data(this.currentData, d => d['date']);

    bars.exit().remove();

    //enter, and merge the selections. This updates the volume series bars.
    bars
      .enter()
      .append('rect')
      .attr('class', 'vol')
      .merge(bars)
      .transition()
      .duration(750)
      .attr('x', d => this.xScale(d['date']))
      .attr('y', d => yVolumeScale(d['volume']))
      .attr('fill', (d, i) => {
        if (i === 0) {
          return '#03a678';
        } else {
          // green bar if price is rising during that period, and red when price is falling
          return this.currentData[i - 1].close > d.close
            ? '#c0392b'
            : '#03a678';
        }
      })
      .attr('width', 1)
      .attr('height', d => this.height - yVolumeScale(d['volume']));

    /* updating of crosshair */
    // select the existing crosshair, and bind new data
    const overlay = d3.select('.overlay');

    // remove old crosshair
    overlay.exit().remove();

    // enter, and update the attributes
    overlay
      .enter()
      .append('g')
      .attr('class', 'focus')
      .style('display', 'none');

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

    /* Mouseover function to generate crosshair */
    function generateCrosshair() {
      //returns corresponding value from the domain
      const correspondingDate = that.xScale.invert(d3.mouse(this)[0]);
      //gets insertion point
      const i = bisectDate(that.currentData, correspondingDate, 1);
      const d0 = that.currentData[i - 1];
      const d1 = that.currentData[i];
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

    /* Updating of dividends */
    // select all dividend groups, and bind the new data
    const dividendSelect = d3
      .select('#chart')
      .select('g')
      .selectAll('.dividend-group')
      .data(dividendData);

    const dividendTooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    dividendSelect.exit().remove();

    // first, enter and append the group element, with the mousemove and mouseout events
    const dividendsEnter = dividendSelect
      .enter()
      .append('g')
      .attr('class', 'dividend-group')
      .on('mousemove', d => {
        dividendTooltip
          .style('opacity', 1)
          .style('color', '#464e56')
          .style('left', d3.event.pageX - 80 + 'px')
          .style('top', d3.event.pageY - 50 + 'px')
          .html(
            `<strong>Dividends: ${d['yield']}</strong> <br/> Date: ${d[
              'date'
            ].toLocaleDateString()}`
          );
      })
      .on('mouseout', d => {
        dividendTooltip
          .transition()
          .duration(200)
          .style('opacity', 0);
      });

    // enter and append the square symbols representing the dividends to the group element
    dividendsEnter
      .append('path')
      .attr('class', 'dividend')
      .attr(
        'd',
        d3
          .symbol()
          .size(300)
          .type(d3.symbolSquare)
      )
      .style('opacity', 0.8)
      .style('cursor', 'pointer')
      .style('fill', '#00ced1');

    // enter and append the 'D' text to the group element
    dividendsEnter
      .append('text')
      .attr('x', -6)
      .attr('y', 5)
      .text(d => 'D')
      .style('cursor', 'pointer')
      .style('fill', '#464e56');

    // update the group element by merging the selections, and translating the elements to their respective positions
    dividendsEnter
      .merge(dividendSelect)
      .transition()
      .duration(200)
      .attr(
        'transform',
        (d, i) => `translate(${this.xScale(d['date'])},${this.height - 80})`
      );

    /* Update the price chart */
    const closeCheckboxToggle = document.querySelector('input[id=close]')
      .checked;
    this.toggleClose(closeCheckboxToggle);

    /* Update the moving average line */
    const movingAverageCheckboxToggle = document.querySelector(
      'input[id=moving-average]'
    ).checked;
    this.toggleMovingAverage(movingAverageCheckboxToggle);

    /* Display OHLC chart */
    const checkboxToggle = document.querySelector('input[id=ohlc]').checked;
    this.toggleOHLC(checkboxToggle);

    /* Display Candlesticks chart */
    const candlesticksToggle = document.querySelector('input[id=candlesticks]')
      .checked;
    this.toggleCandlesticks(candlesticksToggle);

    /* Handle zoom and pan */
    const xAxis = d3.axisBottom(this.xScale);
    const yAxis = d3.axisRight(this.yScale);

    const zoomed = () => {
      var updatedXScale = d3.event.transform.rescaleX(this.xScale);
      var updatedYScale = d3.event.transform.rescaleY(this.yScale);
      this.xAxis.call(xAxis.scale(updatedXScale));
      this.yAxis.call(yAxis.scale(updatedYScale));
    };

    const zoom = d3
      .zoom()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [this.width, this.height]])
      .on('zoom', zoomed);

    d3.select('svg').call(zoom);
  }

  updateLegends(currentPoint) {
    d3.selectAll('.line-legend').remove();

    const legendKeys = Object.keys(currentPoint);
    const lineLegend = d3
      .select('#chart')
      .select('g')
      .selectAll('.line-legend')
      .data(legendKeys)
      .enter()
      .append('g')
      .attr('class', 'line-legend')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`);
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
      .style('font-size', '0.8em')
      .style('fill', 'white')
      .attr('transform', 'translate(15,9)'); //align texts with boxes
  }

  toggleClose(value) {
    if (value) {
      const line = d3
        .line()
        .x(d => this.xScale(d['date']))
        .y(d => this.yScale(d['close']));
      const lineSelect = d3
        .select('#chart')
        .select('svg')
        .select('g')
        .selectAll('.priceChart')
        .data([this.currentData]);

      lineSelect
        .enter()
        .append('path')
        .style('fill', 'none')
        .attr('class', 'priceChart')
        .attr('stroke', 'steelblue')
        .attr('stroke-width', '1.5')
        .attr('d', line);

      // Update the price chart
      lineSelect
        .transition()
        .duration(750)
        .attr('d', line);
    } else {
      // Remove close price chart
      d3.select('.priceChart').remove();
    }
  }

  toggleMovingAverage(value) {
    if (value) {
      // calculates simple moving average over 50 days
      const movingAverageData = this.movingAverage(this.currentData, 49);

      const movingAverageLine = d3
        .line()
        .x(d => this.xScale(d['date']))
        .y(d => this.yScale(d['average']))
        .curve(d3.curveBasis);
      const movingAverageSelect = d3
        .select('#chart')
        .select('svg')
        .select('g')
        .selectAll('.movingAverageLine')
        .data([movingAverageData]);

      movingAverageSelect
        .enter()
        .append('path')
        .style('fill', 'none')
        .attr('class', 'movingAverageLine')
        .attr('stroke', '#FF8900')
        .attr('stroke-width', '1.5')
        .attr('d', movingAverageLine);

      // Update the moving average line
      movingAverageSelect
        .transition()
        .duration(750)
        .attr('d', movingAverageLine);
    } else {
      // Remove moving average line
      d3.select('.movingAverageLine').remove();
    }
  }

  toggleOHLC(value) {
    if (value) {
      const tickWidth = 5;
      const ohlcLine = d3
        .line()
        .x(d => d['x'])
        .y(d => d['y']);

      const ohlcSelection = d3
        .select('#chart')
        .select('g')
        .selectAll('.ohlc')
        .data(this.currentData, d => d['volume']);

      ohlcSelection.exit().remove();

      const ohlcEnter = ohlcSelection
        .enter()
        .append('g')
        .attr('class', 'ohlc')
        .append('g')
        .attr('class', 'bars')
        .classed('up-day', d => d['close'] > d['open'])
        .classed('down-day', d => d['close'] <= d['open']);

      // intraday range represented by vertical line
      ohlcEnter
        .append('path')
        .classed('high-low', true)
        .attr('d', d => {
          return ohlcLine([
            { x: this.xScale(d['date']), y: this.yScale(d['high']) },
            { x: this.xScale(d['date']), y: this.yScale(d['low']) }
          ]);
        });

      // open price represented by left horizontal line
      ohlcEnter
        .append('path')
        .classed('open-tick', true)
        .attr('d', d => {
          return ohlcLine([
            {
              x: this.xScale(d['date']) - tickWidth,
              y: this.yScale(d['open'])
            },
            { x: this.xScale(d['date']), y: this.yScale(d['open']) }
          ]);
        });

      // close price represented by right horizontal line
      ohlcEnter
        .append('path')
        .classed('close-tick', true)
        .attr('d', d => {
          return ohlcLine([
            { x: this.xScale(d['date']), y: this.yScale(d['close']) },
            {
              x: this.xScale(d['date']) + tickWidth,
              y: this.yScale(d['close'])
            }
          ]);
        });
    } else {
      // remove OHLC
      d3.select('#chart')
        .select('g')
        .selectAll('.ohlc')
        .remove();
    }
  }

  toggleCandlesticks(value) {
    if (value) {
      const bodyWidth = 5;
      const candlesticksLine = d3
        .line()
        .x(function(d) {
          return d.x;
        })
        .y(function(d) {
          return d.y;
        });
      const candlesticksSelection = d3
        .select('#chart')
        .select('g')
        .selectAll('.candlesticks')
        .data(this.currentData, d => d['volume']);

      candlesticksSelection.exit().remove();

      const candlesticksEnter = candlesticksSelection
        .enter()
        .append('g')
        .attr('class', 'candlesticks')
        .append('g')
        .attr('class', 'bars')
        .classed('up-day', d => d['close'] > d['open'])
        .classed('down-day', d => d['close'] <= d['open']);

      candlesticksEnter
        .append('path')
        .classed('high-low', true)
        .attr('d', d => {
          return candlesticksLine([
            { x: this.xScale(d['date']), y: this.yScale(d['high']) },
            { x: this.xScale(d['date']), y: this.yScale(d['low']) }
          ]);
        });

      candlesticksEnter
        .append('rect')
        .attr('x', d => this.xScale(d.date) - bodyWidth / 2)
        .attr('y', d => {
          return d['close'] > d['open']
            ? this.yScale(d.close)
            : this.yScale(d.open);
        })
        .attr('width', bodyWidth)
        .attr('height', d => {
          return d['close'] > d['open']
            ? this.yScale(d.open) - this.yScale(d.close)
            : this.yScale(d.close) - this.yScale(d.open);
        });
    } else {
      // remove candlesticks
      d3.select('#chart')
        .select('g')
        .selectAll('.candlesticks')
        .remove();
    }
  }
}
