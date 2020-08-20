for i in `mongo --quiet troupe get-test-users.js`
do
  curl -i https://track.customer.io/api/v1/customers/$i \
     -X DELETE \
     -u 603f30c8d6df16e16ed9:adb43d4655ad0897dde3
done

